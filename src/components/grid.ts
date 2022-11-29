import * as owl from "@odoo/owl";
import {
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH,
} from "../constants";
import { isEqual, isInside, toCartesian, toXC } from "../helpers/index";
import { Model } from "../model";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../registries/menus/col_menu_registry";
import { rowMenuRegistry } from "../registries/menus/row_menu_registry";
import { SpreadsheetEnv, Viewport } from "../types/index";
import { Autofill } from "./autofill";
import { Composer } from "./composer/composer";
import { FiguresContainer } from "./figures/container";
import { startDnd } from "./helpers/drag_and_drop";
import { Menu, MenuState } from "./menu";
import { Overlay } from "./overlay";
import { ScrollBar } from "./scrollbar";

/**
 * The Grid component is the main part of the spreadsheet UI. It is responsible
 * for displaying the actual grid, rendering it, managing events, ...
 *
 * The grid is rendered on a canvas. 3 sub components are (sometimes) displayed
 * on top of the canvas:
 * - a composer (to edit the cell content)
 * - a horizontal resizer (to resize columns)
 * - a vertical resizer (same, for rows)
 */

const { useState } = owl;
const Component = owl.Component;
const { xml, css } = owl.tags;
const { useRef, onMounted, onWillUnmount } = owl.hooks;
export type ContextMenuType = "ROW" | "COL" | "CELL";

const registries = {
  ROW: rowMenuRegistry,
  COL: colMenuRegistry,
  CELL: cellMenuRegistry,
};

// copy and paste are specific events that should not be managed by the keydown event,
// but they shouldn't be preventDefault and stopped (else copy and paste events will not trigger)
// and also should not result in typing the character C or V in the composer
const keyDownMappingIgnore: string[] = ["CTRL+C", "CTRL+V"];

// -----------------------------------------------------------------------------
// Error Tooltip Hook
// -----------------------------------------------------------------------------

interface ErrorTooltip {
  isOpen: boolean;
  text: string;
  style: string;
}
function useErrorTooltip(env: SpreadsheetEnv, getViewPort: () => Viewport): ErrorTooltip {
  const { browser, getters } = env;
  const { Date, setInterval, clearInterval } = browser;
  let x = 0;
  let y = 0;
  let lastMoved = 0;
  let tooltipCol: number, tooltipRow: number;
  const canvasRef = useRef("canvas");
  const tooltip = useState({ isOpen: false, text: "", style: "" });
  let interval;
  function updateMousePosition(e: MouseEvent) {
    x = e.offsetX;
    y = e.offsetY;
    lastMoved = Date.now();
  }
  function getPosition(): [number, number] {
    const viewport = getViewPort();
    const col = getters.getColIndex(x, viewport.left);
    const row = getters.getRowIndex(y, viewport.top);
    return [col, row];
  }
  function checkTiming() {
    if (tooltip.isOpen) {
      const [col, row] = getPosition();
      if (col !== tooltipCol || row !== tooltipRow) {
        tooltip.isOpen = false;
      }
    } else {
      const delta = Date.now() - lastMoved;
      if (400 < delta && delta < 600) {
        // mouse did not move for a short while
        const [col, row] = getPosition();
        if (col < 0 || row < 0) {
          return;
        }
        const mainXc = getters.getMainCell(toXC(col, row));
        const cell = getters.getCell(...toCartesian(mainXc));
        if (cell && cell.error) {
          tooltip.isOpen = true;
          tooltip.text = cell.error;
          tooltipCol = col;
          tooltipRow = row;
          const viewport = getViewPort();
          const [x, y, width, height] = env.getters.getRect(
            { left: col, top: row, right: col, bottom: row },
            viewport
          );
          const hAlign = x + width + 200 < viewport.width ? "left" : "right";
          const hOffset =
            hAlign === "left" ? x + width : viewport.width - x + (SCROLLBAR_WIDTH + 2);
          const vAlign = y + 120 < viewport.height ? "top" : "bottom";
          const vOffset =
            vAlign === "top" ? y : viewport.height - y - height + (SCROLLBAR_WIDTH + 2);
          tooltip.style = `${hAlign}:${hOffset}px;${vAlign}:${vOffset}px`;
        }
      }
    }
  }

  onMounted(() => {
    canvasRef.el!.addEventListener("mousemove", updateMousePosition);
    interval = setInterval(checkTiming, 200);
  });

  onWillUnmount(() => {
    canvasRef.el!.removeEventListener("mousemove", updateMousePosition);
    clearInterval(interval);
  });

  return tooltip;
}

function useTouchMove(handler: (deltaX: number, deltaY: number) => void, canMoveUp: () => boolean) {
  const canvasRef = useRef("canvas");
  let x = null as number | null;
  let y = null as number | null;
  function onTouchStart(ev: TouchEvent) {
    if (ev.touches.length !== 1) return;
    x = ev.touches[0].clientX;
    y = ev.touches[0].clientY;
  }
  function onTouchEnd() {
    x = null;
    y = null;
  }
  function onTouchMove(ev: TouchEvent) {
    if (ev.touches.length !== 1) return;
    // On mobile browsers, swiping down is often associated with "pull to refresh".
    // We only want this behavior if the grid is already at the top.
    // Otherwise we only want to move the canvas up, without triggering any refresh.
    if (canMoveUp()) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    const currentX = ev.touches[0].clientX;
    const currentY = ev.touches[0].clientY;
    handler(x! - currentX, y! - currentY);
    x = currentX;
    y = currentY;
  }
  onMounted(() => {
    canvasRef.el!.addEventListener("touchstart", onTouchStart);
    canvasRef.el!.addEventListener("touchend", onTouchEnd);
    canvasRef.el!.addEventListener("touchmove", onTouchMove);
  });

  onWillUnmount(() => {
    canvasRef.el!.removeEventListener("touchstart", onTouchStart);
    canvasRef.el!.removeEventListener("touchend", onTouchEnd);
    canvasRef.el!.removeEventListener("touchmove", onTouchMove);
  });
}

// -----------------------------------------------------------------------------
// TEMPLATE
// -----------------------------------------------------------------------------
const TEMPLATE = xml/* xml */ `
  <div class="o-grid" t-on-click="focus" t-on-keydown="onKeydown" t-on-wheel="onMouseWheel">
    <t t-if="getters.getEditionMode() !== 'inactive'">
      <Composer t-ref="composer" t-on-composer-unmounted="focus" viewport="snappedViewport"/>
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      tabindex="-1"
      t-on-contextmenu="onCanvasContextMenu"
       />
    <t t-if="errorTooltip.isOpen">
      <div class="o-error-tooltip" t-esc="errorTooltip.text" t-att-style="errorTooltip.style"/>
    </t>
    <t t-if="getters.getEditionMode() === 'inactive'">
      <Autofill position="getAutofillPosition()" viewport="snappedViewport"/>
    </t>
    <Overlay t-on-open-contextmenu="onOverlayContextMenu" viewport="snappedViewport"/>
    <Menu t-if="menuState.isOpen"
      menuItems="menuState.menuItems"
      position="menuState.position"
      t-on-close.stop="menuState.isOpen=false"/>
    <t t-set="gridSize" t-value="getters.getGridSize()"/>
    <FiguresContainer viewport="snappedViewport" model="props.model" t-on-figure-deleted="focus" />
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{gridSize[1]}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{gridSize[0]}}px"/>
    </div>
  </div>`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const CSS = css/* scss */ `
  .o-grid {
    position: relative;
    overflow: hidden;
    background-color: ${BACKGROUND_GRAY_COLOR};

    > canvas {
      border-top: 1px solid #e2e3e3;
      border-bottom: 1px solid #e2e3e3;

      &:focus {
        outline: none;
      }
    }
    .o-error-tooltip {
      position: absolute;
      font-size: 13px;
      width: 180px;
      height: 80px;
      background-color: white;
      box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
      border-left: 3px solid red;
      padding: 10px;
    }
    .o-scrollbar {
      position: absolute;
      overflow: auto;
      z-index: 2;
      &.vertical {
        right: 0;
        top: ${HEADER_HEIGHT}px;
        bottom: ${SCROLLBAR_WIDTH}px;
        width: ${SCROLLBAR_WIDTH}px;
        overflow-x: hidden;
      }
      &.horizontal {
        bottom: 0;
        height: ${SCROLLBAR_WIDTH}px;
        right: ${SCROLLBAR_WIDTH + 1}px;
        left: ${HEADER_WIDTH}px;
        overflow-y: hidden;
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class Grid extends Component<{ model: Model }, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer, Overlay, Menu, Autofill, FiguresContainer };

  private menuState: MenuState = useState({
    isOpen: false,
    position: null,
    menuItems: [],
  });

  private composer = useRef("composer");

  private vScrollbarRef = useRef("vscrollbar");
  private hScrollbarRef = useRef("hscrollbar");
  private vScrollbar: ScrollBar;
  private hScrollbar: ScrollBar;
  private canvas = useRef("canvas");
  private getters = this.env.getters;
  private dispatch = this.env.dispatch;
  private currentPosition = this.getters.getPosition();
  private currentSheet = this.getters.getActiveSheet();

  private currentPositionInViewport = false;
  private clickedCol = 0;
  private clickedRow = 0;
  private viewport: Viewport = {
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  };
  // this viewport represent the same area as the previous one, but 'snapped' to
  // the col/row structure, so, the offsets are correct for computations necessary
  // to align elements to the grid.
  private snappedViewport: Viewport = this.viewport;
  errorTooltip = useErrorTooltip(this.env, () => this.snappedViewport);

  // this map will handle most of the actions that should happen on key down. The arrow keys are managed in the key
  // down itself
  private keyDownMapping: { [key: string]: Function } = {
    ENTER: () => this.dispatch("START_EDITION"),
    TAB: () => this.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 }),
    "SHIFT+TAB": () => this.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 }),
    F2: () => this.dispatch("START_EDITION"),
    DELETE: () => {
      this.dispatch("DELETE_CONTENT", {
        sheet: this.getters.getActiveSheet(),
        target: this.getters.getSelectedZones(),
      });
    },
    "CTRL+A": () => this.dispatch("SELECT_ALL"),
    "CTRL+S": () => {
      this.trigger("save-requested");
    },
    "CTRL+Z": () => this.dispatch("UNDO"),
    "CTRL+Y": () => this.dispatch("REDO"),
  };

  constructor() {
    super(...arguments);
    this.vScrollbar = new ScrollBar(this.vScrollbarRef.el, "vertical");
    this.hScrollbar = new ScrollBar(this.hScrollbarRef.el, "horizontal");
    useTouchMove(this.moveCanvas.bind(this), () => this.vScrollbar.scroll > 0);
  }

  mounted() {
    this.vScrollbar.el = this.vScrollbarRef.el!;
    this.hScrollbar.el = this.hScrollbarRef.el!;
    this.focus();
    this.drawGrid();
  }

  async willUpdateProps() {
    const sheet = this.getters.getActiveSheet();
    if (this.currentSheet !== sheet) {
      // We need to reset the viewport as the sheet is changed
      this.currentPositionInViewport = true;
      this.viewport.offsetX = 0;
      this.viewport.offsetY = 0;
      this.hScrollbar.scroll = 0;
      this.vScrollbar.scroll = 0;
      this.viewport = this.getters.adjustViewportZone(this.viewport);
      this.viewport = this.getters.adjustViewportPosition(this.viewport);
      this.snappedViewport = this.getters.snapViewportToCell(this.viewport);
    }
  }

  patched() {
    this.drawGrid();
  }
  focus() {
    if (this.getters.getEditionMode() !== "selecting" && !this.getters.getSelectedFigureId()) {
      this.canvas.el!.focus();
    }
  }

  onScroll() {
    this.viewport.offsetX = this.hScrollbar.scroll;
    this.viewport.offsetY = this.vScrollbar.scroll;
    const viewport = this.getters.adjustViewportZone(this.viewport);
    if (!isEqual(viewport, this.viewport)) {
      this.viewport = viewport;
      this.render();
    }
    this.snappedViewport = this.getters.snapViewportToCell(this.viewport);
  }

  checkChanges(): boolean {
    const [col, row] = this.getters.getPosition();
    const [curCol, curRow] = this.currentPosition;
    const currentSheet = this.getters.getActiveSheet();
    const changed = currentSheet !== this.currentSheet || col !== curCol || row !== curRow;
    if (changed) {
      this.currentPosition = [col, row];
    }
    if (currentSheet !== this.currentSheet) {
      this.focus();
      this.currentSheet = currentSheet;
    }
    return changed;
  }

  getAutofillPosition() {
    const zone = this.getters.getSelectedZone();
    const sheet = this.getters.getActiveSheet();
    return {
      left:
        this.getters.getCol(sheet, zone.right).end -
        4 +
        HEADER_WIDTH -
        this.snappedViewport.offsetX,
      top:
        this.getters.getRow(sheet, zone.bottom).end -
        4 +
        HEADER_HEIGHT -
        this.snappedViewport.offsetY,
    };
  }

  drawGrid() {
    // update viewport dimensions
    // resize window
    this.viewport.width = this.el!.clientWidth - SCROLLBAR_WIDTH;
    this.viewport.height = this.el!.clientHeight - SCROLLBAR_WIDTH;

    // scrollbar scrolled
    this.viewport.offsetX = this.hScrollbar.scroll;
    this.viewport.offsetY = this.vScrollbar.scroll;

    // needed to reset the bottom and the right on the current viewport to the one of the new
    // active sheet or in any case, the number of cols & rows might have changed.
    this.viewport = this.getters.adjustViewportZone(this.viewport);

    // check for position changes
    if (this.checkChanges() && this.currentPositionInViewport) {
      this.currentPositionInViewport = false;
      this.viewport = this.getters.adjustViewportPosition(this.viewport);
      this.hScrollbar.scroll = this.viewport.offsetX;
      this.vScrollbar.scroll = this.viewport.offsetY;
    }
    this.snappedViewport = this.getters.snapViewportToCell(this.viewport);

    // drawing grid on canvas
    const canvas = this.canvas.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = { ctx, viewport: this.viewport, dpr, thinLineWidth };
    const { width, height } = this.viewport;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    ctx.translate(-0.5, -0.5);
    ctx.scale(dpr, dpr);
    this.props.model.drawGrid(renderingContext);
  }

  private moveCanvas(deltaX, deltaY) {
    this.vScrollbar.scroll = this.vScrollbar.scroll + deltaY;
    this.hScrollbar.scroll = this.hScrollbar.scroll + deltaX;
  }

  onMouseWheel(ev: WheelEvent) {
    function normalize(val: number): number {
      return val * (ev.deltaMode === 0 ? 1 : DEFAULT_CELL_HEIGHT);
    }
    this.moveCanvas(normalize(ev.deltaX), normalize(ev.deltaY));
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  getCartesianCoordinates(ev: MouseEvent): [number, number] {
    const rect = this.el!.getBoundingClientRect();
    const x = ev.pageX - rect.left;
    const y = ev.pageY - rect.top;
    const colIndex = this.getters.getColIndex(x, this.snappedViewport.left);
    const rowIndex = this.getters.getRowIndex(y, this.snappedViewport.top);
    return [colIndex, rowIndex];
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    const [col, row] = this.getCartesianCoordinates(ev);
    if (col < 0 || row < 0) {
      return;
    }
    this.clickedCol = col;
    this.clickedRow = row;

    this.dispatch(ev.ctrlKey ? "START_SELECTION_EXPANSION" : "START_SELECTION");
    if (ev.shiftKey) {
      this.dispatch("ALTER_SELECTION", { cell: [col, row] });
    } else {
      this.dispatch("SELECT_CELL", { col, row });
      this.checkChanges();
    }
    let prevCol = col;
    let prevRow = row;
    const onMouseMove = (ev: MouseEvent) => {
      const [col, row] = this.getCartesianCoordinates(ev);
      if (col < 0 || row < 0) {
        return;
      }
      if (col !== prevCol || row !== prevRow) {
        prevCol = col;
        prevRow = row;
        this.dispatch("ALTER_SELECTION", { cell: [col, row] });
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dispatch(ev.ctrlKey ? "PREPARE_SELECTION_EXPANSION" : "STOP_SELECTION");
      if (this.getters.getEditionMode() === "selecting") {
        if (this.composer.comp) {
          (this.composer.comp as Composer).addTextFromSelection();
        }
      }
      this.canvas.el!.removeEventListener("mousemove", onMouseMove);
      if (this.getters.isPaintingFormat()) {
        this.dispatch("PASTE", {
          target: this.getters.getSelectedZones(),
        });
      }
    };

    startDnd(onMouseMove, onMouseUp);
  }

  onDoubleClick(ev) {
    const [col, row] = this.getCartesianCoordinates(ev);
    if (this.clickedCol === col && this.clickedRow === row) {
      this.dispatch("START_EDITION");
    }
  }
  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    const deltaX = ev.shiftKey ? -1 : 1;
    this.dispatch("MOVE_POSITION", { deltaX, deltaY: 0 });
  }

  processArrows(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const deltaMap = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    };
    this.currentPositionInViewport = true;
    const delta = deltaMap[ev.key];
    if (ev.shiftKey) {
      this.dispatch("ALTER_SELECTION", { delta });
    } else {
      this.dispatch("MOVE_POSITION", { deltaX: delta[0], deltaY: delta[1] });
    }

    if (this.getters.getEditionMode() === "selecting" && this.composer.comp) {
      (this.composer.comp as Composer).addTextFromSelection();
    } else if (this.getters.isPaintingFormat()) {
      this.dispatch("PASTE", {
        target: this.getters.getSelectedZones(),
      });
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key.startsWith("Arrow")) {
      this.processArrows(ev);
      return;
    }

    let keyDownString = "";
    if (ev.ctrlKey) keyDownString += "CTRL+";
    if (ev.metaKey) keyDownString += "CTRL+";
    if (ev.altKey) keyDownString += "ALT+";
    if (ev.shiftKey) keyDownString += "SHIFT+";
    keyDownString += ev.key.toUpperCase();

    let handler = this.keyDownMapping[keyDownString];
    if (handler) {
      ev.preventDefault();
      ev.stopPropagation();
      handler();
      return;
    }
    if (!keyDownMappingIgnore.includes(keyDownString)) {
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        // if the user types a character on the grid, it means he wants to start composing the selected cell with that
        // character
        ev.preventDefault();
        ev.stopPropagation();
        this.dispatch("START_EDITION", { text: ev.key });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Context Menu
  // ---------------------------------------------------------------------------

  onCanvasContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const [col, row] = this.getCartesianCoordinates(ev);
    if (col < 0 || row < 0) {
      return;
    }
    const zones = this.getters.getSelectedZones();
    const lastZone = zones[zones.length - 1];
    let type: ContextMenuType = "CELL";
    if (!isInside(col, row, lastZone)) {
      this.dispatch("SELECT_CELL", { col, row });
    } else {
      if (this.getters.getActiveCols().has(col)) {
        type = "COL";
      } else if (this.getters.getActiveRows().has(row)) {
        type = "ROW";
      }
    }
    this.toggleContextMenu(type, ev.offsetX, ev.offsetY);
  }

  onOverlayContextMenu(ev: CustomEvent) {
    const type = ev.detail.type as ContextMenuType;
    const x = ev.detail.x;
    const y = ev.detail.y;
    this.toggleContextMenu(type, x, y);
  }

  toggleContextMenu(type: ContextMenuType, x: number, y: number) {
    this.menuState.isOpen = true;
    this.menuState.position = {
      x,
      y,
      width: this.el!.clientWidth,
      height: this.el!.clientHeight,
    };
    this.menuState.menuItems = registries[type]
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }
}
