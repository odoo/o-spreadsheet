import * as owl from "@odoo/owl";
import {
  AUTOFILL_EDGE_LENGTH,
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  LINK_TOOLTIP_HEIGHT,
  LINK_TOOLTIP_WIDTH,
  SCROLLBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "../constants";
import {
  findCellInNewZone,
  findVisibleHeader,
  getNextVisibleCellCoords,
  isInside,
  MAX_DELAY,
  range,
} from "../helpers/index";
import { Model } from "../model";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../registries/menus/col_menu_registry";
import { rowMenuRegistry } from "../registries/menus/row_menu_registry";
import { BoxDims, CellValueType, Client, Position, SpreadsheetEnv, Viewport } from "../types/index";
import { Autofill } from "./autofill";
import { ClientTag } from "./collaborative_client_tag";
import { GridComposer } from "./composer/grid_composer";
import { ErrorToolTip } from "./error_tooltip";
import { FiguresContainer } from "./figures/container";
import { startDnd } from "./helpers/drag_and_drop";
import { Highlight } from "./highlight/highlight";
import { LinkDisplay } from "./link/link_display";
import { LinkEditor } from "./link/link_editor";
import { Menu, MenuState } from "./menu";
import { Overlay } from "./overlay";
import { Popover } from "./popover";
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
const { useRef, onMounted, onWillUnmount } = owl.hooks;
export type ContextMenuType = "ROW" | "COL" | "CELL";

const registries = {
  ROW: rowMenuRegistry,
  COL: colMenuRegistry,
  CELL: cellMenuRegistry,
};

const LINK_EDITOR_WIDTH = 340;
const LINK_EDITOR_HEIGHT = 197;

const ERROR_TOOLTIP_HEIGHT = 80;
const ERROR_TOOLTIP_WIDTH = 180;
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
    <Popover
      t-if="errorTooltip.isOpen"
      anchorRect="errorTooltip.anchorRect"
      positioning="'right'"
      dynamicHeight="true"
      childMaxWidth="${ERROR_TOOLTIP_WIDTH}"
      childMaxHeight="${ERROR_TOOLTIP_HEIGHT}">
      <ErrorToolTip text="errorTooltip.text"/>
    </Popover>
    <Popover
      t-if="shouldDisplayLink"
      anchorRect="popoverAnchorRect"
      positioning="'bottom'"
      childMaxWidth="${LINK_TOOLTIP_WIDTH}"
      childMaxHeight="${LINK_TOOLTIP_HEIGHT}">
      <LinkDisplay cellPosition="activeCellPosition"/>
    </Popover>
    <Popover
      t-if="props.linkEditorIsOpen"
      anchorRect="popoverAnchorRect"
      positioning="'bottom'"
      childMaxWidth="${LINK_EDITOR_WIDTH}"
      childMaxHeight="${LINK_EDITOR_HEIGHT}">
      <LinkEditor cellPosition="activeCellPosition"/>
    </Popover>
    <t t-if="getters.getEditionMode() === 'inactive'">
      <Autofill position="getAutofillPosition()"/>
    </t>
    <t t-if="getters.getEditionMode() !== 'inactive'">
      <t t-foreach="getters.getHighlights()" t-as="highlight">
        <t t-if="highlight.sheet === getters.getActiveSheetId()">
          <Highlight zone="highlight.zone" color="highlight.color"/>
        </t>
      </t>
    </t>
    <Overlay t-on-open-contextmenu="onOverlayContextMenu" />
    <Menu t-if="menuState.isOpen"
      menuItems="menuState.menuItems"
      position="menuState.position"
      t-on-close.stop="closeMenu"/>
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

interface Props {
  sidePanelIsOpen: boolean;
  model: Model;
  linkEditorIsOpen: boolean;
}

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class Grid extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = {
    GridComposer,
    Overlay,
    Menu,
    Autofill,
    FiguresContainer,
    ClientTag,
    Highlight,
    ErrorToolTip,
    LinkDisplay,
    LinkEditor,
    Popover,
  };

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

  hoveredCell = useCellHovered(this.env, () => this.getters.getActiveSnappedViewport());

  get errorTooltip() {
    const { col, row } = this.hoveredCell;
    if (col === undefined || row === undefined) {
      return { isOpen: false };
    }
    const sheetId = this.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);

    if (cell && cell.evaluated.type === CellValueType.error) {
      const viewport = this.getters.getActiveSnappedViewport();
      const [x, y, width, height] = this.getters.getRect(
        { left: col, top: row, right: col, bottom: row },
        viewport
      );
      return {
        isOpen: true,
        anchorRect: { x: x, y: y + TOPBAR_HEIGHT, height, width },
        text: cell.evaluated.error,
      };
    }
    return { isOpen: false };
  }

  get activeCellPosition(): Position {
    const [col, row] = this.getters.getMainCell(
      this.getters.getActiveSheetId(),
      ...this.getters.getPosition()
    );
    return { col, row };
  }

  get shouldDisplayLink(): boolean {
    const sheetId = this.getters.getActiveSheetId();
    const { col, row } = this.activeCellPosition;
    const viewport = this.getters.getActiveSnappedViewport();
    const cell = this.getters.getCell(sheetId, col, row);
    return (
      this.getters.isVisibleInViewport(col, row, viewport) &&
      !!cell &&
      cell.isLink() &&
      !this.menuState.isOpen &&
      !this.props.linkEditorIsOpen &&
      !this.props.sidePanelIsOpen
    );
  }

  /**
   * Get a reasonable position to display the popover, under the active cell.
   * Used by link popover components.
   */
  get popoverAnchorRect(): BoxDims {
    const [col, row] = this.getters.getBottomLeftCell(
      this.getters.getActiveSheetId(),
      ...this.getters.getPosition()
    );
    const viewport = this.getters.getActiveSnappedViewport();
    const [x, y, width, height] = this.getters.getRect(
      { left: col, top: row, right: col, bottom: row },
      viewport
    );
    return { x, y: y + TOPBAR_HEIGHT, height, width };
  }

  // this map will handle most of the actions that should happen on key down. The arrow keys are managed in the key
  // down itself
  private keyDownMapping: { [key: string]: Function } = {
    ENTER: () => {
      const cell = this.getters.getActiveCell();
      !cell || cell.isEmpty()
        ? this.trigger("composer-cell-focused")
        : this.trigger("composer-content-focused");
    },
    TAB: () => this.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 }),
    "SHIFT+TAB": () => this.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 }),
    F2: () => {
      const cell = this.getters.getActiveCell();
      !cell || cell.isEmpty()
        ? this.trigger("composer-cell-focused")
        : this.trigger("composer-content-focused");
    },
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
    "CTRL+Z": () => this.dispatch("REQUEST_UNDO"),
    "CTRL+Y": () => this.dispatch("REQUEST_REDO"),
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
    "CTRL+U": () =>
      this.dispatch("SET_FORMATTING", {
        sheetId: this.getters.getActiveSheetId(),
        target: this.getters.getSelectedZones(),
        style: { underline: !this.getters.getCurrentStyle().underline },
      }),
    "ALT+=": () => {
      const sheetId = this.getters.getActiveSheetId();

      const mainSelectedZone = this.getters.getSelectedZone();
      const sums = this.getters.getAutomaticSums(
        sheetId,
        mainSelectedZone,
        this.getters.getPosition()
      );
      if (
        this.getters.isSingleCellOrMerge(sheetId, mainSelectedZone) ||
        (this.getters.isEmpty(sheetId, mainSelectedZone) && sums.length <= 1)
      ) {
        const zone = sums[0]?.zone;
        const zoneXc = zone ? this.getters.zoneToXC(sheetId, sums[0].zone) : "";
        const formula = `=SUM(${zoneXc})`;
        this.trigger("composer-cell-focused", {
          content: formula,
          selection: { start: 5, end: 5 + zoneXc.length },
        });
      } else {
        this.dispatch("SUM_SELECTION");
      }
    },
    "CTRL+HOME": () => {
      const sheet = this.getters.getActiveSheet();
      const [col, row] = getNextVisibleCellCoords(sheet, 0, 0);
      this.dispatch("SELECT_CELL", { col, row });
    },
    "CTRL+END": () => {
      const sheet = this.getters.getActiveSheet();
      const col = findVisibleHeader(sheet, "cols", range(0, sheet.cols.length).reverse())!;
      const row = findVisibleHeader(sheet, "rows", range(0, sheet.rows.length).reverse())!;
      this.dispatch("SELECT_CELL", { col, row });
    },
    "SHIFT+ ": () => {
      const { cols } = this.getters.getActiveSheet();
      const newZone = { ...this.getters.getSelectedZone(), left: 0, right: cols.length - 1 };
      this.dispatch("SET_SELECTION", {
        anchor: this.getters.getPosition(),
        zones: [newZone],
        anchorZone: newZone,
      });
    },
    "CTRL+ ": () => {
      const { rows } = this.getters.getActiveSheet();
      const newZone = { ...this.getters.getSelectedZone(), top: 0, bottom: rows.length - 1 };
      this.dispatch("SET_SELECTION", {
        anchor: this.getters.getPosition(),
        zones: [newZone],
        anchorZone: newZone,
      });
    },
    "CTRL+SHIFT+ ": () => {
      this.dispatch("SELECT_ALL");
    },
    "SHIFT+PAGEDOWN": () => {
      this.dispatch("ACTIVATE_NEXT_SHEET");
    },
    "SHIFT+PAGEUP": () => {
      this.dispatch("ACTIVATE_PREVIOUS_SHEET");
    },
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
    this.resizeGrid();
    this.drawGrid();
  }

  patched() {
    this.resizeGrid();
    this.drawGrid();
  }

  focus() {
    if (!this.getters.isSelectingForComposer() && !this.getters.getSelectedFigureId()) {
      this.canvas.el!.focus();
    }
  }

  resizeGrid() {
    const currentHeight = this.el!.clientHeight - SCROLLBAR_WIDTH;
    const currentWidth = this.el!.clientWidth - SCROLLBAR_WIDTH;
    const { height: viewportHeight, width: viewportWidth } = this.getters.getViewportDimension();
    if (currentHeight != viewportHeight || currentWidth !== viewportWidth) {
      this.dispatch("RESIZE_VIEWPORT", {
        height: currentHeight,
        width: currentWidth,
      });
    }
  }

  onScroll() {
    const { offsetX, offsetY } = this.getters.getActiveViewport();
    if (offsetX !== this.hScrollbar.scroll || offsetY !== this.vScrollbar.scroll) {
      const { maxOffsetX, maxOffsetY } = this.getters.getMaximumViewportOffset(
        this.getters.getActiveSheet()
      );
      this.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: Math.min(this.hScrollbar.scroll, maxOffsetX),
        offsetY: Math.min(this.vScrollbar.scroll, maxOffsetY),
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

  /**
   * Get the coordinates in pixels, with 0,0 being the top left of the grid itself
   */
  getCoordinates(ev: MouseEvent): [number, number] {
    const rect = this.el!.getBoundingClientRect();
    const x = ev.pageX - rect.left;
    const y = ev.pageY - rect.top;
    return [x, y];
  }

  getCartesianCoordinates(ev: MouseEvent): [number, number] {
    const [x, y] = this.getCoordinates(ev);
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

    const sheetId = this.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);
    if (!cell?.isLink()) {
      this.closeLinkEditor();
    }

    this.dispatch(ev.ctrlKey ? "START_SELECTION_EXPANSION" : "START_SELECTION");
    if (ev.shiftKey) {
      this.dispatch("ALTER_SELECTION", { cell: [col, row] });
    } else {
      this.dispatch("SELECT_CELL", { col, row });
      this.checkSheetChanges();
    }
    let prevCol = col;
    let prevRow = row;

    let isEdgeScrolling: boolean = false;
    let timeOutId: any = null;
    let timeoutDelay: number = 0;

    let currentEv: MouseEvent;

    const sheet = this.getters.getActiveSheet();

    const onMouseMove = (ev: MouseEvent) => {
      currentEv = ev;
      if (timeOutId) {
        return;
      }

      const [x, y] = this.getCoordinates(currentEv);

      isEdgeScrolling = false;
      timeoutDelay = 0;

      const colEdgeScroll = this.getters.getEdgeScrollCol(x);
      const rowEdgeScroll = this.getters.getEdgeScrollRow(y);

      const { left, right, top, bottom } = this.getters.getActiveSnappedViewport();
      let col: number, row: number;
      if (colEdgeScroll.canEdgeScroll) {
        col = colEdgeScroll.direction > 0 ? right : left - 1;
      } else {
        col = this.getters.getColIndex(x, left);
        col = col === -1 ? prevCol : col;
      }

      if (rowEdgeScroll.canEdgeScroll) {
        row = rowEdgeScroll.direction > 0 ? bottom : top - 1;
      } else {
        row = this.getters.getRowIndex(y, top);
        row = row === -1 ? prevRow : row;
      }

      isEdgeScrolling = colEdgeScroll.canEdgeScroll || rowEdgeScroll.canEdgeScroll;

      timeoutDelay = Math.min(
        colEdgeScroll.canEdgeScroll ? colEdgeScroll.delay : MAX_DELAY,
        rowEdgeScroll.canEdgeScroll ? rowEdgeScroll.delay : MAX_DELAY
      );

      if (col !== prevCol || row !== prevRow) {
        prevCol = col;
        prevRow = row;
        this.dispatch("ALTER_SELECTION", { cell: [col, row] });
      }
      if (isEdgeScrolling) {
        const offsetX = sheet.cols[left + colEdgeScroll.direction].start;
        const offsetY = sheet.rows[top + rowEdgeScroll.direction].start;
        this.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
        timeOutId = setTimeout(() => {
          timeOutId = null;
          onMouseMove(currentEv);
        }, Math.round(timeoutDelay));
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      clearTimeout(timeOutId);
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
      const cell = this.getters.getActiveCell();
      !cell || cell.isEmpty()
        ? this.trigger("composer-cell-focused")
        : this.trigger("composer-content-focused");
    }
  }

  closeLinkEditor() {
    this.trigger("link-editor-closed");
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
    this.closeLinkEditor();
    const deltaMap = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    };
    const delta = deltaMap[ev.key];
    if (ev.shiftKey) {
      const oldZone = this.getters.getSelectedZone();
      this.dispatch("ALTER_SELECTION", { delta });
      const newZone = this.getters.getSelectedZone();
      const viewport = this.getters.getActiveSnappedViewport();
      const sheet = this.getters.getActiveSheet();
      const [col, row] = findCellInNewZone(oldZone, newZone, viewport);

      const { left, right, top, bottom, offsetX, offsetY } = viewport;
      const newOffsetX =
        col < left || col > right - 1 ? sheet.cols[left + delta[0]].start : offsetX;
      const newOffsetY = row < top || row > bottom - 1 ? sheet.rows[top + delta[1]].start : offsetY;
      if (newOffsetX !== offsetX || newOffsetY !== offsetY) {
        this.dispatch("SET_VIEWPORT_OFFSET", { offsetX: newOffsetX, offsetY: newOffsetY });
      }
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
        this.trigger("composer-cell-focused", { content: ev.key });
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
    this.closeLinkEditor();
    this.menuState.isOpen = true;
    this.menuState.position = { x, y: y + TOPBAR_HEIGHT };
    this.menuState.menuItems = registries[type]
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.focus();
  }
}
