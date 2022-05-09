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
  DEFAULT_CELL_HEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH,
} from "../../constants";
import {
  findCellInNewZone,
  findVisibleHeader,
  getNextVisibleCellPosition,
  isInside,
  MAX_DELAY,
  range,
} from "../../helpers/index";
import { interactiveCut } from "../../helpers/ui/cut";
import { interactivePaste } from "../../helpers/ui/paste";
import { ComposerSelection } from "../../plugins/ui/edition";
import { cellMenuRegistry } from "../../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../../registries/menus/col_menu_registry";
import { dashboardMenuRegistry } from "../../registries/menus/dashboard_menu_registry";
import { rowMenuRegistry } from "../../registries/menus/row_menu_registry";
import {
  CellValueType,
  Client,
  DOMCoordinates,
  Position,
  Ref,
  SpreadsheetChildEnv,
  UID,
} from "../../types/index";
import { Autofill } from "../autofill/autofill";
import { ClientTag } from "../collaborative_client_tag/collaborative_client_tag";
import { GridComposer } from "../composer/grid_composer/grid_composer";
import { ErrorToolTip } from "../error_tooltip/error_tooltip";
import { FiguresContainer } from "../figures/container/container";
import { HeadersOverlay } from "../headers_overlay/headers_overlay";
import { css } from "../helpers/css";
import { startDnd } from "../helpers/drag_and_drop";
import { useAbsolutePosition } from "../helpers/position_hook";
import { Highlight } from "../highlight/highlight/highlight";
import { LinkDisplay } from "../link/link_display/link_display";
import { LinkEditor } from "../link/link_editor/link_editor";
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

interface HoveredPosition {
  col?: number;
  row?: number;
}

export function useCellHovered(env: SpreadsheetChildEnv) {
  const hoveredPosition: HoveredPosition = useState({} as HoveredPosition);
  const { Date, setInterval, clearInterval } = window;
  const gridRef = useRef("gridOverlay");
  let x = 0;
  let y = 0;
  let lastMoved = 0;
  let interval;

  function getPosition(): Position {
    const col = env.model.getters.getColIndex(x);
    const row = env.model.getters.getRowIndex(y);
    return { col, row };
  }

  function checkTiming() {
    const { col, row } = getPosition();
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
    gridRef.el!.addEventListener("mousemove", updateMousePosition);
    interval = setInterval(checkTiming, 200);
  });

  onWillUnmount(() => {
    gridRef.el!.removeEventListener("mousemove", updateMousePosition);
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
      z-index: 2;
      &.vertical {
        right: 0;
        bottom: ${SCROLLBAR_WIDTH}px;
        width: ${SCROLLBAR_WIDTH}px;
        overflow-x: hidden;
      }
      &.horizontal {
        bottom: 0;
        height: ${SCROLLBAR_WIDTH}px;
        right: ${SCROLLBAR_WIDTH + 1}px;
        overflow-y: hidden;
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
  linkEditorIsOpen: boolean;
  exposeFocus: (focus: () => void) => void;
  onComposerContentFocused: () => void;
  onGridComposerCellFocused: (content?: string, selection?: ComposerSelection) => void;
  onLinkEditorClosed: () => void;
  onSaveRequested?: () => void;
}

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class Grid extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Grid";
  static components = {
    GridComposer,
    HeadersOverlay,
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

  LINK_EDITOR_WIDTH = 340;
  LINK_EDITOR_HEIGHT = 180;
  ERROR_TOOLTIP_HEIGHT = 40;
  ERROR_TOOLTIP_WIDTH = 180;
  LINK_TOOLTIP_HEIGHT = 43;
  LINK_TOOLTIP_WIDTH = 220;

  private menuState!: MenuState;
  private vScrollbarRef!: Ref<HTMLElement>;
  private hScrollbarRef!: Ref<HTMLElement>;
  private gridRef!: Ref<HTMLElement>;
  private vScrollbar!: ScrollBar;
  private hScrollbar!: ScrollBar;
  private gridOverlay!: Ref<HTMLElement>;
  private canvas!: Ref<HTMLElement>;
  private currentSheet!: UID;
  private clickedCol!: number;
  private clickedRow!: number;

  // last string that was cut or copied. It is necessary so we can make the
  // difference between a paste coming from the sheet itself, or from the
  // os clipboard
  private clipBoardString!: string;
  private canvasPosition!: DOMCoordinates;
  hoveredCell!: HoveredPosition;

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
    this.clipBoardString = "";
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
    return `
      top: ${this.env.isDashboard() ? 0 : HEADER_HEIGHT}px;`;
  }

  get hScrollbarStyle() {
    return `
      left: ${this.env.isDashboard() ? 0 : HEADER_WIDTH}px;`;
  }

  get errorTooltip() {
    const { col, row } = this.hoveredCell;
    if (col === undefined || row === undefined) {
      return { isOpen: false };
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { col: mainCol, row: mainRow } = this.env.model.getters.getMainCellPosition(
      sheetId,
      col,
      row
    );
    const cell = this.env.model.getters.getCell(sheetId, mainCol, mainRow);

    if (cell && cell.evaluated.type === CellValueType.error) {
      const viewport = this.env.model.getters.getActiveSnappedViewport();
      const [x, y, width] = this.env.model.getters.getRect(
        { left: col, top: row, right: col, bottom: row },
        viewport
      );
      return {
        isOpen: true,
        position: {
          x: x + width + this.canvasPosition.x,
          y: y + this.canvasPosition.y,
        },
        text: cell.evaluated.error,
        cellWidth: width,
      };
    }
    return { isOpen: false };
  }

  get activeCellPosition(): Position {
    const { col, row } = this.env.model.getters.getPosition();
    return this.env.model.getters.getMainCellPosition(
      this.env.model.getters.getActiveSheetId(),
      col,
      row
    );
  }

  get shouldDisplayLink(): boolean {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { col, row } = this.activeCellPosition;
    const viewport = this.env.model.getters.getActiveSnappedViewport();
    const cell = this.env.model.getters.getCell(sheetId, col, row);
    return (
      this.env.model.getters.isVisibleInViewport(col, row, viewport) &&
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
  get popoverPosition() {
    const position = this.env.model.getters.getPosition();
    const { col, row } = this.env.model.getters.getBottomLeftCell(
      this.env.model.getters.getActiveSheetId(),
      position.col,
      position.row
    );
    const viewport = this.env.model.getters.getActiveSnappedViewport();
    const [x, y, width, height] = this.env.model.getters.getRect(
      { left: col, top: row, right: col, bottom: row },
      viewport
    );
    return {
      position: {
        x: x + this.canvasPosition.x,
        y: y + height + this.canvasPosition.y,
      },
      cellWidth: width,
      cellHeight: height,
    };
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
    "CTRL+A": () => this.env.model.selection.selectAll(),
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
      const sheet = this.env.model.getters.getActiveSheet();
      const { col, row } = getNextVisibleCellPosition(sheet, 0, 0);
      this.env.model.selection.selectCell(col, row);
    },
    "CTRL+END": () => {
      const sheet = this.env.model.getters.getActiveSheet();
      const col = findVisibleHeader(sheet, "cols", range(0, sheet.cols.length).reverse())!;
      const row = findVisibleHeader(sheet, "rows", range(0, sheet.rows.length).reverse())!;
      this.env.model.selection.selectCell(col, row);
    },
    "SHIFT+ ": () => {
      const { cols } = this.env.model.getters.getActiveSheet();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        left: 0,
        right: cols.length - 1,
      };
      const position = this.env.model.getters.getPosition();
      this.env.model.selection.selectZone({ cell: position, zone: newZone });
    },
    "CTRL+ ": () => {
      const { rows } = this.env.model.getters.getActiveSheet();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        top: 0,
        bottom: rows.length - 1,
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
    const currentHeight = this.gridEl.clientHeight - SCROLLBAR_WIDTH;
    const currentWidth = this.gridEl.clientWidth - SCROLLBAR_WIDTH;
    const { height: viewportHeight, width: viewportWidth } =
      this.env.model.getters.getViewportDimensionWithHeaders();
    if (currentHeight != viewportHeight || currentWidth !== viewportWidth) {
      this.env.model.dispatch("RESIZE_VIEWPORT", {
        height: currentHeight - (this.env.isDashboard() ? 0 : HEADER_HEIGHT),
        width: currentWidth - (this.env.isDashboard() ? 0 : HEADER_WIDTH),
      });
    }
  }

  onScroll() {
    const { offsetScrollbarX, offsetScrollbarY } =
      this.env.model.getters.getActiveSnappedViewport();
    if (
      offsetScrollbarX !== this.hScrollbar.scroll ||
      offsetScrollbarY !== this.vScrollbar.scroll
    ) {
      const { maxOffsetX, maxOffsetY } = this.env.model.getters.getMaximumViewportOffset(
        this.env.model.getters.getActiveSheet()
      );
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
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSnappedViewport();
    const col = this.env.model.getters.getColDimensions(sheetId, zone.right);
    const row = this.env.model.getters.getRowDimensions(sheetId, zone.bottom);
    return {
      left: col.end - AUTOFILL_EDGE_LENGTH / 2 + HEADER_WIDTH - offsetX,
      top: row.end - AUTOFILL_EDGE_LENGTH / 2 + HEADER_HEIGHT - offsetY,
    };
  }

  drawGrid() {
    //reposition scrollbar
    const { offsetScrollbarX, offsetScrollbarY } =
      this.env.model.getters.getActiveSnappedViewport();
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
      viewport: this.env.model.getters.getActiveSnappedViewport(),
      dpr,
      thinLineWidth,
    };
    const { width, height } = this.env.model.getters.getViewportDimensionWithHeaders();
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    ctx.translate(-0.5, -0.5);
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
    const rect = this.gridOverlay.el!.getBoundingClientRect();
    const x = ev.pageX - rect.left;
    const y = ev.pageY - rect.top;
    return [x, y];
  }

  getCartesianCoordinates(ev: MouseEvent): [number, number] {
    const [x, y] = this.getCoordinates(ev);
    const colIndex = this.env.model.getters.getColIndex(x);
    const rowIndex = this.env.model.getters.getRowIndex(y);
    return [colIndex, rowIndex];
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0 || this.env.isDashboard()) {
      // not main button, probably a context menu
      return;
    }
    const [col, row] = this.getCartesianCoordinates(ev);
    if (col < 0 || row < 0) {
      return;
    }
    this.clickedCol = col;
    this.clickedRow = row;

    const sheetId = this.env.model.getters.getActiveSheetId();
    const { col: mainCol, row: mainRow } = this.env.model.getters.getMainCellPosition(
      sheetId,
      col,
      row
    );
    const cell = this.env.model.getters.getCell(sheetId, mainCol, mainRow);
    if (!cell?.isLink()) {
      this.closeLinkEditor();
    }
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

    let isEdgeScrolling: boolean = false;
    let timeOutId: any = null;
    let timeoutDelay: number = 0;

    let currentEv: MouseEvent;

    const onMouseMove = (ev: MouseEvent) => {
      currentEv = ev;
      if (timeOutId) {
        return;
      }

      const [x, y] = this.getCoordinates(currentEv);

      isEdgeScrolling = false;
      timeoutDelay = 0;

      const colEdgeScroll = this.env.model.getters.getEdgeScrollCol(x);
      const rowEdgeScroll = this.env.model.getters.getEdgeScrollRow(y);

      const { left, right, top, bottom } = this.env.model.getters.getActiveSnappedViewport();
      let col: number, row: number;
      if (colEdgeScroll.canEdgeScroll) {
        col = colEdgeScroll.direction > 0 ? right : left - 1;
      } else {
        col = this.env.model.getters.getColIndex(x);
        col = col === -1 ? prevCol : col;
      }

      if (rowEdgeScroll.canEdgeScroll) {
        row = rowEdgeScroll.direction > 0 ? bottom : top - 1;
      } else {
        row = this.env.model.getters.getRowIndex(y);
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
        this.env.model.selection.setAnchorCorner(col, row);
      }
      if (isEdgeScrolling) {
        const offsetX = this.env.model.getters.getColDimensions(
          sheetId,
          left + colEdgeScroll.direction
        ).start;
        const offsetY = this.env.model.getters.getRowDimensions(
          sheetId,
          top + rowEdgeScroll.direction
        ).start;
        this.env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
        timeOutId = setTimeout(() => {
          timeOutId = null;
          onMouseMove(currentEv);
        }, Math.round(timeoutDelay));
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      clearTimeout(timeOutId);
      this.env.model.dispatch(
        ev.ctrlKey ? "PREPARE_SELECTION_INPUT_EXPANSION" : "STOP_SELECTION_INPUT"
      );
      this.gridOverlay.el!.removeEventListener("mousemove", onMouseMove);
      if (this.env.model.getters.isPaintingFormat()) {
        this.env.model.dispatch("PASTE", {
          target: this.env.model.getters.getSelectedZones(),
        });
      }
    };

    startDnd(onMouseMove, onMouseUp);
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

  closeLinkEditor() {
    this.props.onLinkEditorClosed();
  }
  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  processArrows(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.closeLinkEditor();
    const arrowMap = {
      ArrowDown: { direction: "down", delta: [0, 1] },
      ArrowLeft: { direction: "left", delta: [-1, 0] },
      ArrowRight: { direction: "right", delta: [1, 0] },
      ArrowUp: { direction: "up", delta: [0, -1] },
    };
    const { direction, delta } = arrowMap[ev.key];
    if (ev.shiftKey) {
      const oldZone = this.env.model.getters.getSelectedZone();
      this.env.model.selection.resizeAnchorZone(direction, ev.ctrlKey ? "end" : "one");
      const newZone = this.env.model.getters.getSelectedZone();
      const viewport = this.env.model.getters.getActiveSnappedViewport();
      const { cols, rows, id: sheetId } = this.env.model.getters.getActiveSheet();
      let { col, row } = findCellInNewZone(oldZone, newZone);
      col = Math.min(col, cols.length - 1);
      row = Math.min(row, rows.length - 1);
      const { left, right, top, bottom, offsetX, offsetY } = viewport;
      const newOffsetX =
        col < left || col > right - 1
          ? this.env.model.getters.getColDimensions(sheetId, left + delta[0]).start
          : offsetX;
      const newOffsetY =
        row < top || row > bottom - 1
          ? this.env.model.getters.getRowDimensions(sheetId, top + delta[1]).start
          : offsetY;
      if (newOffsetX !== offsetX || newOffsetY !== offsetY) {
        this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        });
      }
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

  toggleContextMenu(type: ContextMenuType, x: number, y: number) {
    this.closeLinkEditor();
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
    const target = this.env.model.getters.getSelectedZones();
    if (cut) {
      interactiveCut(this.env, target);
    } else {
      this.env.model.dispatch("COPY", { target });
    }
    const content = this.env.model.getters.getClipboardContent();
    this.clipBoardString = content;
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
      if (this.clipBoardString === content) {
        // the paste actually comes from o-spreadsheet itself
        interactivePaste(this.env, target);
      } else {
        this.env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
          target,
          text: content,
        });
      }
    }
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.focus();
  }
}
