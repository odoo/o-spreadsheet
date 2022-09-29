import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import {
  AUTOFILL_EDGE_LENGTH,
  BACKGROUND_GRAY_COLOR,
  CANVAS_SHIFT,
  ComponentsImportance,
  DEFAULT_CELL_HEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH,
} from "../../constants";
import { isInside, range } from "../../helpers/index";
import { interactiveCut } from "../../helpers/ui/cut_interactive";
import { interactivePaste, interactivePasteFromOS } from "../../helpers/ui/paste_interactive";
import { ComposerSelection } from "../../plugins/ui/edition";
import { cellMenuRegistry } from "../../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../../registries/menus/col_menu_registry";
import { dashboardMenuRegistry } from "../../registries/menus/dashboard_menu_registry";
import { rowMenuRegistry } from "../../registries/menus/row_menu_registry";
import { ClosedCellPopover, PositionedCellPopover } from "../../types/cell_popovers";
import {
  Client,
  DOMCoordinates,
  HeaderIndex,
  Pixel,
  Position,
  Ref,
  SpreadsheetChildEnv,
  UID,
} from "../../types/index";
import { Autofill } from "../autofill/autofill";
import { ClientTag } from "../collaborative_client_tag/collaborative_client_tag";
import { GridComposer } from "../composer/grid_composer/grid_composer";
import { FiguresContainer } from "../figures/container/container";
import { HeadersOverlay } from "../headers_overlay/headers_overlay";
import { css } from "../helpers/css";
import { dragAndDropBeyondTheViewport } from "../helpers/drag_and_drop";
import { useAbsolutePosition } from "../helpers/position_hook";
import { useInterval } from "../helpers/time_hooks";
import { Highlight } from "../highlight/highlight/highlight";
import { Menu, MenuState } from "../menu/menu";
import { Popover } from "../popover/popover";
import { ScrollBar } from "../scrollbar";
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

export type ContextMenuType = "ROW" | "COL" | "CELL" | "DASHBOARD";

const registries = {
  ROW: rowMenuRegistry,
  COL: colMenuRegistry,
  CELL: cellMenuRegistry,
  DASHBOARD: dashboardMenuRegistry,
};

// copy and paste are specific events that should not be managed by the keydown event,
// but they shouldn't be preventDefault and stopped (else copy and paste events will not trigger)
// and also should not result in typing the character C or V in the composer
const keyDownMappingIgnore: string[] = ["CTRL+C", "CTRL+V"];

// -----------------------------------------------------------------------------
// Error Tooltip Hook
// -----------------------------------------------------------------------------

function useCellHovered(env: SpreadsheetChildEnv): Partial<Position> {
  const hoveredPosition: Partial<Position> = useState({} as Partial<Position>);
  const { Date } = window;
  const gridRef = useRef("gridOverlay");
  const vScrollbarRef = useRef("vscrollbar");
  const hScrollbarRef = useRef("hscrollbar");
  let x = 0;
  let y = 0;
  let lastMoved = 0;

  function getPosition(): Position {
    const col = env.model.getters.getColIndex(x);
    const row = env.model.getters.getRowIndex(y);
    return { col, row };
  }

  const { pause, resume } = useInterval(checkTiming, 200);

  function checkTiming() {
    const { col, row } = getPosition();
    const delta = Date.now() - lastMoved;
    if (delta > 300 && (col !== hoveredPosition.col || row !== hoveredPosition.row)) {
      hoveredPosition.col = undefined;
      hoveredPosition.row = undefined;
    }
    if (delta > 300) {
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

  function recompute() {
    const { col, row } = getPosition();
    if (col !== hoveredPosition.col || row !== hoveredPosition.row) {
      hoveredPosition.col = undefined;
      hoveredPosition.row = undefined;
    }
  }

  function reset() {
    hoveredPosition.col = undefined;
    hoveredPosition.row = undefined;
  }

  onMounted(() => {
    const grid = gridRef.el!;
    grid.addEventListener("mousemove", updateMousePosition);
    grid.addEventListener("mouseleave", pause);
    grid.addEventListener("mouseenter", resume);
    grid.addEventListener("mousedown", recompute);

    vScrollbarRef.el!.addEventListener("scroll", reset);
    hScrollbarRef.el!.addEventListener("scroll", reset);
  });

  onWillUnmount(() => {
    const grid = gridRef.el!;
    grid.removeEventListener("mousemove", updateMousePosition);
    grid.removeEventListener("mouseleave", pause);
    grid.removeEventListener("mouseenter", resume);
    grid.removeEventListener("mousedown", recompute);

    vScrollbarRef.el!.removeEventListener("scroll", reset);
    hScrollbarRef.el!.removeEventListener("scroll", reset);
  });
  return hoveredPosition;
}

function useTouchMove(handler: (deltaX: Pixel, deltaY: Pixel) => void, canMoveUp: () => boolean) {
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

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
css/* scss */ `
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
      z-index: ${ComponentsImportance.ScrollBar};
      background-color: ${BACKGROUND_GRAY_COLOR};

      &.vertical {
        right: 0;
        bottom: ${SCROLLBAR_WIDTH}px;
        width: ${SCROLLBAR_WIDTH}px;
        overflow-x: hidden;
      }
      &.horizontal {
        bottom: 0;
        height: ${SCROLLBAR_WIDTH}px;
        right: ${SCROLLBAR_WIDTH}px;
        overflow-y: hidden;
      }
      &.corner {
        right: 0px;
        bottom: 0px;
        height: ${SCROLLBAR_WIDTH}px;
        width: ${SCROLLBAR_WIDTH}px;
        border-top: 1px solid #e2e3e3;
        border-left: 1px solid #e2e3e3;
      }
    }

    .o-grid-overlay {
      position: absolute;
      outline: none;
    }
  }
`;

interface Props {
  sidePanelIsOpen: boolean;
  exposeFocus: (focus: () => void) => void;
  onComposerContentFocused: () => void;
  onGridComposerCellFocused: (content?: string, selection?: ComposerSelection) => void;
  onSaveRequested?: () => void;
}

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class Grid extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Grid";
  static components = {
    GridComposer,
    HeadersOverlay,
    Menu,
    Autofill,
    FiguresContainer,
    ClientTag,
    Highlight,
    Popover,
  };

  private menuState!: MenuState;
  private vScrollbarRef!: Ref<HTMLElement>;
  private hScrollbarRef!: Ref<HTMLElement>;
  private gridRef!: Ref<HTMLElement>;
  private vScrollbar!: ScrollBar;
  private hScrollbar!: ScrollBar;
  private gridOverlay!: Ref<HTMLElement>;
  private canvas!: Ref<HTMLElement>;
  private currentSheet!: UID;
  private clickedCol!: HeaderIndex;
  private clickedRow!: HeaderIndex;

  private canvasPosition!: DOMCoordinates;
  hoveredCell!: Partial<Position>;

  setup() {
    this.menuState = useState({
      isOpen: false,
      position: null,
      menuItems: [],
    });
    this.vScrollbarRef = useRef("vscrollbar");
    this.hScrollbarRef = useRef("hscrollbar");
    this.gridRef = useRef("grid");
    this.gridOverlay = useRef("gridOverlay");
    this.canvas = useRef("canvas");
    this.canvasPosition = useAbsolutePosition(this.canvas);
    this.vScrollbar = new ScrollBar(this.vScrollbarRef.el, "vertical");
    this.hScrollbar = new ScrollBar(this.hScrollbarRef.el, "horizontal");
    this.currentSheet = this.env.model.getters.getActiveSheetId();
    this.clickedCol = 0;
    this.clickedRow = 0;
    this.hoveredCell = useCellHovered(this.env);

    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
    useTouchMove(this.moveCanvas.bind(this), () => this.vScrollbar.scroll > 0);
    onMounted(() => this.initGrid());
    onPatched(() => {
      this.drawGrid();
      this.resizeGrid();
    });
    this.props.exposeFocus(() => this.focus());
  }

  private initGrid() {
    this.vScrollbar.el = this.vScrollbarRef.el!;
    this.hScrollbar.el = this.hScrollbarRef.el!;
    this.focus();
    this.resizeGrid();
    this.drawGrid();
  }

  get gridOverlayStyle() {
    return `
      top: ${this.env.isDashboard() ? 0 : HEADER_HEIGHT}px;
      left: ${this.env.isDashboard() ? 0 : HEADER_WIDTH}px;
      height: calc(100% - ${this.env.isDashboard() ? 0 : HEADER_HEIGHT}px);
      width: calc(100% - ${this.env.isDashboard() ? 0 : HEADER_WIDTH}px);
    `;
  }

  get vScrollbarStyle() {
    const { y } = this.env.model.getters.getMainViewportRect();
    const { yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    return `
      ${this.env.isDashboard() || yRatio >= 1 ? "width: 0px;" : ""}
      top: ${y + (this.env.isDashboard() ? 0 : HEADER_HEIGHT)}px;`;
  }

  get hScrollbarStyle() {
    const { x } = this.env.model.getters.getMainViewportRect();
    const { xRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    return `
      ${this.env.isDashboard() || xRatio >= 1 ? "width: 0px;" : ""}
      left: ${x + (this.env.isDashboard() ? 0 : HEADER_WIDTH)}px;`;
  }

  get cellPopover(): PositionedCellPopover | ClosedCellPopover {
    if (this.menuState.isOpen) {
      return { isOpen: false };
    }
    const popover = this.env.model.getters.getCellPopover(this.hoveredCell);
    if (!popover.isOpen) {
      return { isOpen: false };
    }
    const coordinates = popover.coordinates;
    return {
      ...popover,
      // transform from the "canvas coordinate system" to the "body coordinate system"
      coordinates: {
        x: coordinates.x + this.canvasPosition.x,
        y: coordinates.y + this.canvasPosition.y,
      },
    };
  }

  get activeCellPosition(): Position {
    const { col, row } = this.env.model.getters.getPosition();
    return this.env.model.getters.getMainCellPosition(
      this.env.model.getters.getActiveSheetId(),
      col,
      row
    );
  }

  onClosePopover() {
    this.closeOpenedPopover();
    this.focus();
  }

  // this map will handle most of the actions that should happen on key down. The arrow keys are managed in the key
  // down itself
  private keyDownMapping: { [key: string]: Function } = {
    ENTER: () => {
      const cell = this.env.model.getters.getActiveCell();
      !cell || cell.isEmpty()
        ? this.props.onGridComposerCellFocused()
        : this.props.onComposerContentFocused();
    },
    TAB: () => this.env.model.selection.moveAnchorCell("right", "one"),
    "SHIFT+TAB": () => this.env.model.selection.moveAnchorCell("left", "one"),
    F2: () => {
      const cell = this.env.model.getters.getActiveCell();
      !cell || cell.isEmpty()
        ? this.props.onGridComposerCellFocused()
        : this.props.onComposerContentFocused();
    },
    DELETE: () => {
      this.env.model.dispatch("DELETE_CONTENT", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
      });
    },
    "CTRL+A": () => this.env.model.selection.loopSelection(),
    "CTRL+S": () => {
      this.props.onSaveRequested?.();
    },
    "CTRL+Z": () => this.env.model.dispatch("REQUEST_UNDO"),
    "CTRL+Y": () => this.env.model.dispatch("REQUEST_REDO"),
    "CTRL+B": () =>
      this.env.model.dispatch("SET_FORMATTING", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
        style: { bold: !this.env.model.getters.getCurrentStyle().bold },
      }),
    "CTRL+I": () =>
      this.env.model.dispatch("SET_FORMATTING", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
        style: { italic: !this.env.model.getters.getCurrentStyle().italic },
      }),
    "CTRL+U": () =>
      this.env.model.dispatch("SET_FORMATTING", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        target: this.env.model.getters.getSelectedZones(),
        style: { underline: !this.env.model.getters.getCurrentStyle().underline },
      }),
    "ALT+=": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();

      const mainSelectedZone = this.env.model.getters.getSelectedZone();
      const { anchor } = this.env.model.getters.getSelection();
      const sums = this.env.model.getters.getAutomaticSums(sheetId, mainSelectedZone, anchor.cell);
      if (
        this.env.model.getters.isSingleCellOrMerge(sheetId, mainSelectedZone) ||
        (this.env.model.getters.isEmpty(sheetId, mainSelectedZone) && sums.length <= 1)
      ) {
        const zone = sums[0]?.zone;
        const zoneXc = zone ? this.env.model.getters.zoneToXC(sheetId, sums[0].zone) : "";
        const formula = `=SUM(${zoneXc})`;
        this.props.onGridComposerCellFocused(formula, { start: 5, end: 5 + zoneXc.length });
      } else {
        this.env.model.dispatch("SUM_SELECTION");
      }
    },
    "CTRL+HOME": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const { col, row } = this.env.model.getters.getNextVisibleCellPosition(sheetId, 0, 0);
      this.env.model.selection.selectCell(col, row);
    },
    "CTRL+END": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const col = this.env.model.getters.findVisibleHeader(
        sheetId,
        "COL",
        range(0, this.env.model.getters.getNumberCols(sheetId)).reverse()
      )!;
      const row = this.env.model.getters.findVisibleHeader(
        sheetId,
        "ROW",
        range(0, this.env.model.getters.getNumberRows(sheetId)).reverse()
      )!;
      this.env.model.selection.selectCell(col, row);
    },
    "SHIFT+ ": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        left: 0,
        right: this.env.model.getters.getNumberCols(sheetId) - 1,
      };
      const position = this.env.model.getters.getPosition();
      this.env.model.selection.selectZone({ cell: position, zone: newZone });
    },
    "CTRL+ ": () => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        top: 0,
        bottom: this.env.model.getters.getNumberRows(sheetId) - 1,
      };
      const position = this.env.model.getters.getPosition();
      this.env.model.selection.selectZone({ cell: position, zone: newZone });
    },
    "CTRL+SHIFT+ ": () => {
      this.env.model.selection.selectAll();
    },
    "SHIFT+PAGEDOWN": () => {
      this.env.model.dispatch("ACTIVATE_NEXT_SHEET");
    },
    "SHIFT+PAGEUP": () => {
      this.env.model.dispatch("ACTIVATE_PREVIOUS_SHEET");
    },
    PAGEDOWN: () => this.env.model.dispatch("SHIFT_VIEWPORT_DOWN"),
    PAGEUP: () => this.env.model.dispatch("SHIFT_VIEWPORT_UP"),
  };

  focus() {
    if (!this.env.model.getters.getSelectedFigureId()) {
      this.gridOverlay.el!.focus();
    }
  }

  get gridEl(): HTMLElement {
    if (!this.gridRef.el) {
      throw new Error("Grid el is not defined.");
    }
    return this.gridRef.el;
  }

  getGridBoundingClientRect(): DOMRect {
    return this.gridEl.getBoundingClientRect();
  }

  resizeGrid() {
    const scrollBarWidth = this.env.isDashboard() ? 0 : SCROLLBAR_WIDTH;
    const currentHeight = this.gridEl.clientHeight - scrollBarWidth;
    const currentWidth = this.gridEl.clientWidth - scrollBarWidth;
    const { height: viewportHeight, width: viewportWidth } =
      this.env.model.getters.getSheetViewDimensionWithHeaders();
    if (currentHeight != viewportHeight || currentWidth !== viewportWidth) {
      const { top: gridTop, left: gridLeft } = this.gridEl.getBoundingClientRect();
      const { top, left } = this.gridOverlay.el!.getBoundingClientRect();
      const gridOffsetX = left - gridLeft;
      const gridOffsetY = top - gridTop;
      this.env.model.dispatch("RESIZE_SHEETVIEW", {
        width: currentWidth - gridOffsetX,
        height: currentHeight - gridOffsetY,
        gridOffsetX,
        gridOffsetY,
      });
    }
  }

  onScroll() {
    const { offsetScrollbarX, offsetScrollbarY } =
      this.env.model.getters.getActiveSheetScrollInfo();
    if (
      offsetScrollbarX !== this.hScrollbar.scroll ||
      offsetScrollbarY !== this.vScrollbar.scroll
    ) {
      const { maxOffsetX, maxOffsetY } = this.env.model.getters.getMaximumSheetOffset();
      this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: Math.min(this.hScrollbar.scroll, maxOffsetX),
        offsetY: Math.min(this.vScrollbar.scroll, maxOffsetY),
      });
    }
  }

  checkSheetChanges() {
    const currentSheet = this.env.model.getters.getActiveSheetId();
    if (currentSheet !== this.currentSheet) {
      this.focus();
      this.currentSheet = currentSheet;
    }
  }

  getAutofillPosition() {
    const zone = this.env.model.getters.getSelectedZone();
    const rect = this.env.model.getters.getVisibleRect(zone);
    return {
      left: rect.x + rect.width - AUTOFILL_EDGE_LENGTH / 2,
      top: rect.y + rect.height - AUTOFILL_EDGE_LENGTH / 2,
    };
  }

  isAutoFillActive(): boolean {
    const zone = this.env.model.getters.getSelectedZone();
    const rect = this.env.model.getters.getVisibleRect({
      left: zone.right,
      right: zone.right,
      top: zone.bottom,
      bottom: zone.bottom,
    });
    return !(rect.width === 0 || rect.height === 0);
  }

  drawGrid() {
    //reposition scrollbar
    const { offsetScrollbarX, offsetScrollbarY } =
      this.env.model.getters.getActiveSheetScrollInfo();
    this.hScrollbar.scroll = offsetScrollbarX;
    this.vScrollbar.scroll = offsetScrollbarY;
    // check for position changes
    this.checkSheetChanges();
    // drawing grid on canvas
    const canvas = this.canvas.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = {
      ctx,
      dpr,
      thinLineWidth,
    };
    const { width, height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    // Imagine each pixel as a large square. The whole-number coordinates (0, 1, 2…)
    // are the edges of the squares. If you draw a one-unit-wide line between whole-number
    // coordinates, it will overlap opposite sides of the pixel square, and the resulting
    // line will be drawn two pixels wide. To draw a line that is only one pixel wide,
    // you need to shift the coordinates by 0.5 perpendicular to the line's direction.
    // http://diveintohtml5.info/canvas.html#pixel-madness
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr, dpr);
    this.env.model.drawGrid(renderingContext);
  }

  private moveCanvas(deltaX, deltaY) {
    this.vScrollbar.scroll = this.vScrollbar.scroll + deltaY;
    this.hScrollbar.scroll = this.hScrollbar.scroll + deltaX;
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
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

  isCellHovered(col: HeaderIndex, row: HeaderIndex): boolean {
    return this.hoveredCell.col === col && this.hoveredCell.row === row;
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  /**
   * Get the coordinates in pixels, with 0,0 being the top left of the grid itself
   */
  getCoordinates(ev: MouseEvent): [Pixel, Pixel] {
    return [ev.offsetX, ev.offsetY];
  }

  getCartesianCoordinates(ev: MouseEvent): [HeaderIndex, HeaderIndex] {
    const [x, y] = this.getCoordinates(ev);
    const colIndex = this.env.model.getters.getColIndex(x);
    const rowIndex = this.env.model.getters.getRowIndex(y);
    return [colIndex, rowIndex];
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    if (ev.ctrlKey) {
      this.env.model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    }
    const [col, row] = this.getCartesianCoordinates(ev);
    if (col < 0 || row < 0) {
      return;
    }
    this.clickedCol = col;
    this.clickedRow = row;

    if (this.env.model.getters.isDashboard()) {
      this.env.model.selection.selectCell(col, row);
      return;
    }

    this.closeOpenedPopover();
    if (this.env.model.getters.getEditionMode() === "editing") {
      this.env.model.dispatch("STOP_EDITION");
    }
    if (ev.shiftKey) {
      this.env.model.selection.setAnchorCorner(col, row);
    } else if (ev.ctrlKey) {
      this.env.model.selection.addCellToSelection(col, row);
    } else {
      this.env.model.selection.selectCell(col, row);
    }
    this.checkSheetChanges();
    let prevCol = col;
    let prevRow = row;

    const onMouseMove = (col: HeaderIndex, row: HeaderIndex) => {
      if ((col !== prevCol && col != -1) || (row !== prevRow && row != -1)) {
        prevCol = col === -1 ? prevCol : col;
        prevRow = row === -1 ? prevRow : row;
        this.env.model.selection.setAnchorCorner(prevCol, prevRow);
      }
    };
    const onMouseUp = () => {
      this.env.model.dispatch("STOP_SELECTION_INPUT");
      if (this.env.model.getters.isPaintingFormat()) {
        this.env.model.dispatch("PASTE", {
          target: this.env.model.getters.getSelectedZones(),
        });
      }
    };
    dragAndDropBeyondTheViewport(this.env, onMouseMove, onMouseUp);
  }

  onDoubleClick(ev) {
    const [col, row] = this.getCartesianCoordinates(ev);
    if (this.clickedCol === col && this.clickedRow === row) {
      const cell = this.env.model.getters.getActiveCell();
      !cell || cell.isEmpty()
        ? this.props.onGridComposerCellFocused()
        : this.props.onComposerContentFocused();
    }
  }

  closeOpenedPopover() {
    this.env.model.dispatch("CLOSE_CELL_POPOVER");
  }
  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  processArrows(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.closeOpenedPopover();
    const arrowMap = {
      ArrowDown: { direction: "down", delta: [0, 1] },
      ArrowLeft: { direction: "left", delta: [-1, 0] },
      ArrowRight: { direction: "right", delta: [1, 0] },
      ArrowUp: { direction: "up", delta: [0, -1] },
    };
    const { direction } = arrowMap[ev.key];
    if (ev.shiftKey) {
      this.env.model.selection.resizeAnchorZone(direction, ev.ctrlKey ? "end" : "one");
    } else {
      this.env.model.selection.moveAnchorCell(direction, ev.ctrlKey ? "end" : "one");
    }

    if (this.env.model.getters.isPaintingFormat()) {
      this.env.model.dispatch("PASTE", {
        target: this.env.model.getters.getSelectedZones(),
      });
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (this.env.isDashboard()) {
      return;
    }
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

        this.props.onGridComposerCellFocused(ev.key);
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
    const zones = this.env.model.getters.getSelectedZones();
    const lastZone = zones[zones.length - 1];
    let type: ContextMenuType = "CELL";
    if (!isInside(col, row, lastZone)) {
      this.env.model.dispatch("UNFOCUS_SELECTION_INPUT");
      this.env.model.dispatch("STOP_EDITION");
      this.env.model.selection.selectCell(col, row);
    } else {
      if (this.env.model.getters.getActiveCols().has(col)) {
        type = "COL";
      } else if (this.env.model.getters.getActiveRows().has(row)) {
        type = "ROW";
      }
    }
    this.toggleContextMenu(type, ev.clientX, ev.clientY);
  }

  toggleContextMenu(type: ContextMenuType, x: Pixel, y: Pixel) {
    this.closeOpenedPopover();
    if (this.env.model.getters.isDashboard()) {
      type = "DASHBOARD";
    }
    this.menuState.isOpen = true;
    this.menuState.position = { x, y };
    this.menuState.menuItems = registries[type]
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  copy(cut: boolean, ev: ClipboardEvent) {
    if (!this.gridEl.contains(document.activeElement)) {
      return;
    }
    /* If we are currently editing a cell, let the default behavior */
    if (this.env.model.getters.getEditionMode() !== "inactive") {
      return;
    }
    if (cut) {
      interactiveCut(this.env);
    } else {
      this.env.model.dispatch("COPY");
    }
    const content = this.env.model.getters.getClipboardContent();
    ev.clipboardData!.setData("text/plain", content);
    ev.preventDefault();
  }

  paste(ev: ClipboardEvent) {
    if (!this.gridEl.contains(document.activeElement)) {
      return;
    }
    const clipboardData = ev.clipboardData!;
    if (clipboardData.types.indexOf("text/plain") > -1) {
      const content = clipboardData.getData("text/plain");
      const target = this.env.model.getters.getSelectedZones();
      const clipBoardString = this.env.model.getters.getClipboardContent();
      if (clipBoardString === content) {
        // the paste actually comes from o-spreadsheet itself
        interactivePaste(this.env, target);
      } else {
        interactivePasteFromOS(this.env, target, content);
      }
    }
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.focus();
  }
}
