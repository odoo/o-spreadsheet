import * as owl from "@odoo/owl";
import {
  AUTOFILL_EDGE_LENGTH,
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH,
} from "../constants";
import { isInside } from "../helpers/index";
import { Model } from "../model";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../registries/menus/col_menu_registry";
import { rowMenuRegistry } from "../registries/menus/row_menu_registry";
import { Client, SpreadsheetEnv, Viewport } from "../types/index";
import { Autofill } from "./autofill";
import { ClientTag } from "./collaborative_client_tag";
import { GridComposer } from "./composer/grid_composer";
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

const { Component, useState } = owl;
const { xml, css } = owl.tags;
const { useRef, onMounted, onWillUnmount, useExternalListener } = owl.hooks;
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

interface HoveredPosition {
  col?: number;
  row?: number;
}

export function useCellHovered(env: SpreadsheetEnv, getViewPort: () => Viewport) {
  const hoveredPosition: HoveredPosition = useState({});
  const { browser, getters } = env;
  const { Date, setInterval, clearInterval } = browser;
  const canvasRef = useRef("canvas");
  let x = 0;
  let y = 0;
  let lastMoved = 0;
  let interval;

  function getPosition(): [number, number] {
    const viewport = getViewPort();
    const col = getters.getColIndex(x, viewport.left);
    const row = getters.getRowIndex(y, viewport.top);
    return [col, row];
  }

  function checkTiming() {
    const [col, row] = getPosition();
    const delta = Date.now() - lastMoved;
    if (col !== hoveredPosition.col || row !== hoveredPosition.row) {
      hoveredPosition.col = undefined;
      hoveredPosition.row = undefined;
    }
    if (400 < delta && delta < 600) {
      if (col < 0 || row < 0) {
        return;
      }
      hoveredPosition.col = col;
      hoveredPosition.row = row;
    }
  }
  function updateMousePosition(e: MouseEvent) {
    x = e.offsetX;
    y = e.offsetY;
    lastMoved = Date.now();
  }

  onMounted(() => {
    canvasRef.el!.addEventListener("mousemove", updateMousePosition);
    interval = setInterval(checkTiming, 200);
  });

  onWillUnmount(() => {
    canvasRef.el!.removeEventListener("mousemove", updateMousePosition);
    clearInterval(interval);
  });
  return hoveredPosition;
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
      <GridComposer
        t-on-composer-unmounted="focus"
        focus="props.focusComposer"
        />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      tabindex="-1"
      t-on-contextmenu="onCanvasContextMenu"
       />
    <t t-foreach="getters.getClientsToDisplay()" t-as="client" t-key="getClientPositionKey(client)">
      <ClientTag name="client.name"
                 color="client.color"
                 col="client.position.col"
                 row="client.position.row"
                 active="isCellHovered(client.position.col, client.position.row)"
                 />
    </t>
    <t t-if="errorTooltip.isOpen">
      <div class="o-error-tooltip" t-esc="errorTooltip.text" t-att-style="errorTooltip.style"/>
    </t>
    <t t-if="getters.getEditionMode() === 'inactive'">
      <Autofill position="getAutofillPosition()"/>
    </t>
    <Overlay t-on-open-contextmenu="onOverlayContextMenu" />
    <Menu t-if="menuState.isOpen"
      menuItems="menuState.menuItems"
      position="menuState.position"
      t-on-close.stop="menuState.isOpen=false"/>
    <t t-set="gridSize" t-value="getters.getGridDimension(getters.getActiveSheet())"/>
    <FiguresContainer model="props.model" sidePanelIsOpen="props.sidePanelIsOpen" t-on-figure-deleted="focus" />
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{gridSize.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{gridSize.width}}px"/>
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
        top: ${SCROLLBAR_WIDTH + 1}px;
        bottom: 15px;
        width: 15px;
      }
      &.horizontal {
        bottom: 0;
        height: 15px;
        right: ${SCROLLBAR_WIDTH + 1}px;
        left: ${HEADER_WIDTH}px;
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
  static components = { GridComposer, Overlay, Menu, Autofill, FiguresContainer, ClientTag };

  private menuState: MenuState = useState({
    isOpen: false,
    position: null,
    menuItems: [],
  });

  private vScrollbarRef = useRef("vscrollbar");
  private hScrollbarRef = useRef("hscrollbar");
  private vScrollbar: ScrollBar;
  private hScrollbar: ScrollBar;
  private canvas = useRef("canvas");
  private getters = this.env.getters;
  private dispatch = this.env.dispatch;
  private currentSheet = this.getters.getActiveSheetId();

  private clickedCol = 0;
  private clickedRow = 0;

  // errorTooltip = useErrorTooltip(this.env, () => this.snappedViewport);
  hoveredCell = useCellHovered(this.env, () => this.getters.getActiveSnappedViewport());

  get errorTooltip() {
    const { col, row } = this.hoveredCell;
    if (!col || !row) {
      return { isOpen: false };
    }
    const sheetId = this.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);

    if (cell && cell.error) {
      const viewport = this.getters.getActiveSnappedViewport();
      const { width: viewportWidth, height: viewportHeight } = this.getters.getViewportDimension();
      const [x, y, width, height] = this.getters.getRect(
        { left: col, top: row, right: col, bottom: row },
        viewport
      );
      const hAlign = x + width + 200 < viewportWidth ? "left" : "right";
      const hOffset = hAlign === "left" ? x + width : viewportWidth - x + (SCROLLBAR_WIDTH + 2);
      const vAlign = y + 120 < viewportHeight ? "top" : "bottom";
      const vOffset = vAlign === "top" ? y : viewportHeight - y - height + (SCROLLBAR_WIDTH + 2);
      return {
        isOpen: true,
        style: `${hAlign}:${hOffset}px;${vAlign}:${vOffset}px`,
        text: cell.error,
      };
    }
    return { isOpen: false };
  }

  // this map will handle most of the actions that should happen on key down. The arrow keys are managed in the key
  // down itself
  private keyDownMapping: { [key: string]: Function } = {
    ENTER: () => this.trigger("composer-focused"),
    TAB: () => this.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 }),
    "SHIFT+TAB": () => this.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 }),
    F2: () => this.trigger("composer-focused"),
    DELETE: () => {
      this.dispatch("DELETE_CONTENT", {
        sheetId: this.getters.getActiveSheetId(),
        target: this.getters.getSelectedZones(),
      });
    },
    "CTRL+A": () => this.dispatch("SELECT_ALL"),
    "CTRL+S": () => {
      this.trigger("save-requested");
    },
    "CTRL+Z": () => this.dispatch("UNDO"),
    "CTRL+Y": () => this.dispatch("REDO"),
    "CTRL+B": () =>
      this.dispatch("SET_FORMATTING", {
        sheetId: this.getters.getActiveSheetId(),
        target: this.getters.getSelectedZones(),
        style: { bold: !this.getters.getCurrentStyle().bold },
      }),
    "CTRL+I": () =>
      this.dispatch("SET_FORMATTING", {
        sheetId: this.getters.getActiveSheetId(),
        target: this.getters.getSelectedZones(),
        style: { italic: !this.getters.getCurrentStyle().italic },
      }),
  };

  constructor() {
    super(...arguments);
    this.vScrollbar = new ScrollBar(this.vScrollbarRef.el, "vertical");
    this.hScrollbar = new ScrollBar(this.hScrollbarRef.el, "horizontal");
    useTouchMove(this.moveCanvas.bind(this), () => this.vScrollbar.scroll > 0);
    useExternalListener(window, "resize", this.resizeGrid.bind(this));
  }

  mounted() {
    this.vScrollbar.el = this.vScrollbarRef.el!;
    this.hScrollbar.el = this.hScrollbarRef.el!;
    this.focus();
    this.resizeGrid();
    this.drawGrid();
  }

  patched() {
    this.drawGrid();
  }

  focus() {
    if (!this.getters.isSelectingForComposer() && !this.getters.getSelectedFigureId()) {
      this.canvas.el!.focus();
    }
  }

  resizeGrid() {
    this.dispatch("RESIZE_VIEWPORT", {
      height: this.el!.clientHeight - SCROLLBAR_WIDTH,
      width: this.el!.clientWidth - SCROLLBAR_WIDTH,
    });
  }

  onScroll() {
    const { offsetX, offsetY } = this.getters.getActiveViewport();
    if (offsetX !== this.hScrollbar.scroll || offsetY !== this.vScrollbar.scroll) {
      this.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: this.hScrollbar.scroll,
        offsetY: this.vScrollbar.scroll,
      });
    }
  }

  checkSheetChanges() {
    const currentSheet = this.getters.getActiveSheetId();
    if (currentSheet !== this.currentSheet) {
      this.focus();
      this.currentSheet = currentSheet;
    }
  }

  getAutofillPosition() {
    const zone = this.getters.getSelectedZone();
    const sheet = this.getters.getActiveSheet();
    const { offsetX, offsetY } = this.getters.getActiveSnappedViewport();
    return {
      left: sheet.cols[zone.right].end - AUTOFILL_EDGE_LENGTH / 2 + HEADER_WIDTH - offsetX,
      top: sheet.rows[zone.bottom].end - AUTOFILL_EDGE_LENGTH / 2 + HEADER_HEIGHT - offsetY,
    };
  }

  drawGrid() {
    //reposition scrollbar
    const { offsetX, offsetY } = this.getters.getActiveViewport();
    this.hScrollbar.scroll = offsetX;
    this.vScrollbar.scroll = offsetY;
    // check for position changes
    this.checkSheetChanges();
    // drawing grid on canvas
    const canvas = this.canvas.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = {
      ctx,
      viewport: this.getters.getActiveViewport(),
      dpr,
      thinLineWidth,
    };
    const { width, height } = this.getters.getViewportDimension();
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
    this.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: this.hScrollbar.scroll,
      offsetY: this.vScrollbar.scroll,
    });
  }

  getClientPositionKey(client: Client) {
    return `${client.id}-${client.position?.sheetId}-${client.position?.col}-${client.position?.row}`;
  }

  onMouseWheel(ev: WheelEvent) {
    if (ev.ctrlKey) {
      return;
    }
    function normalize(val: number): number {
      return val * (ev.deltaMode === 0 ? 1 : DEFAULT_CELL_HEIGHT);
    }

    const deltaX = ev.shiftKey ? ev.deltaY : ev.deltaX;
    const deltaY = ev.shiftKey ? ev.deltaX : ev.deltaY;
    this.moveCanvas(normalize(deltaX), normalize(deltaY));
  }

  isCellHovered(col: number, row: number): boolean {
    return this.hoveredCell.col === col && this.hoveredCell.row === row;
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  getCartesianCoordinates(ev: MouseEvent): [number, number] {
    const rect = this.el!.getBoundingClientRect();
    const x = ev.pageX - rect.left;
    const y = ev.pageY - rect.top;
    const { left, top } = this.getters.getActiveSnappedViewport();
    const colIndex = this.getters.getColIndex(x, left);
    const rowIndex = this.getters.getRowIndex(y, top);
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
      this.checkSheetChanges();
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
      this.trigger("composer-focused");
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
    const delta = deltaMap[ev.key];
    if (ev.shiftKey) {
      this.dispatch("ALTER_SELECTION", { delta });
    } else {
      this.dispatch("MOVE_POSITION", { deltaX: delta[0], deltaY: delta[1] });
    }

    if (this.getters.isPaintingFormat()) {
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
        this.trigger("composer-focused", { content: ev.key });
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
      this.dispatch("STOP_EDITION");
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
