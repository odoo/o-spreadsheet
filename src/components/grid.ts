import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  useExternalListener,
  useRef,
  useState,
  xml,
} from "@odoo/owl";
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
import { interactivePaste } from "../helpers/ui/paste";
import { ComposerSelection } from "../plugins/ui/edition";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../registries/menus/col_menu_registry";
import { rowMenuRegistry } from "../registries/menus/row_menu_registry";
import {
  CellValueType,
  Client,
  Position,
  Ref,
  SpreadsheetChildEnv,
  UID,
  Viewport,
} from "../types/index";
import { Autofill } from "./autofill";
import { ClientTag } from "./collaborative_client_tag";
import { GridComposer } from "./composer/grid_composer";
import { ErrorToolTip } from "./error_tooltip";
import { FiguresContainer } from "./figures/container";
import { css } from "./helpers/css";
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

export type ContextMenuType = "ROW" | "COL" | "CELL";

const registries = {
  ROW: rowMenuRegistry,
  COL: colMenuRegistry,
  CELL: cellMenuRegistry,
};

const LINK_EDITOR_WIDTH = 340;
const LINK_EDITOR_HEIGHT = 180;

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

export function useCellHovered(env: SpreadsheetChildEnv, getViewPort: () => Viewport) {
  const hoveredPosition: HoveredPosition = useState({} as HoveredPosition);
  const { Date, setInterval, clearInterval } = window;
  const canvasRef = useRef("canvas");
  let x = 0;
  let y = 0;
  let lastMoved = 0;
  let interval;

  function getPosition(): [number, number] {
    const viewport = getViewPort();
    const col = env.model.getters.getColIndex(x, viewport.left);
    const row = env.model.getters.getRowIndex(y, viewport.top);
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
  <div class="o-grid" t-att-class="{'o-two-columns': !props.sidePanelIsOpen}" t-on-click="focus" t-on-keydown="onKeydown" t-on-wheel="onMouseWheel" t-ref="grid">
    <t t-if="env.model.getters.getEditionMode() !== 'inactive'">
      <GridComposer
        onComposerUnmounted="() => this.focus()"
        focus="props.focusComposer"
        />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      tabindex="-1"
      t-on-contextmenu="onCanvasContextMenu"
       />
    <t t-foreach="env.model.getters.getClientsToDisplay()" t-as="client" t-key="getClientPositionKey(client)">
      <ClientTag name="client.name"
                 color="client.color"
                 col="client.position.col"
                 row="client.position.row"
                 active="isCellHovered(client.position.col, client.position.row)"
                 />
    </t>
    <Popover
      t-if="errorTooltip.isOpen"
      position="errorTooltip.position"
      childWidth="${ERROR_TOOLTIP_WIDTH}"
      childHeight="${ERROR_TOOLTIP_HEIGHT}">
      <ErrorToolTip text="errorTooltip.text"/>
    </Popover>
    <Popover
      t-if="shouldDisplayLink"
      position="popoverPosition.position"
      flipHorizontalOffset="-popoverPosition.cellWidth"
      flipVerticalOffset="-popoverPosition.cellHeight"
      childWidth="${LINK_TOOLTIP_WIDTH}"
      childHeight="${LINK_TOOLTIP_HEIGHT}">
      <LinkDisplay cellPosition="activeCellPosition"/>
    </Popover>
    <Popover
      t-if="props.linkEditorIsOpen"
      position="popoverPosition.position"
      flipHorizontalOffset="-popoverPosition.cellWidth"
      flipVerticalOffset="-popoverPosition.cellHeight"
      childWidth="${LINK_EDITOR_WIDTH}"
      childHeight="${LINK_EDITOR_HEIGHT}">
      <LinkEditor cellPosition="activeCellPosition" onLinkEditorClosed="props.onLinkEditorClosed"/>
    </Popover>
    <t t-if="env.model.getters.getEditionMode() === 'inactive'">
      <Autofill position="getAutofillPosition()" getGridBoundingClientRect="() => this.getGridBoundingClientRect()"/>
    </t>
    <t t-if="env.model.getters.getEditionMode() !== 'inactive'">
      <t t-foreach="env.model.getters.getHighlights()" t-as="highlight" t-key="highlight_index">
        <t t-if="highlight.sheet === env.model.getters.getActiveSheetId()">
          <Highlight zone="highlight.zone" color="highlight.color"/>
        </t>
      </t>
    </t>
    <Overlay onOpenContextMenu="(type, x, y) => this.toggleContextMenu(type, x, y)" />
    <Menu t-if="menuState.isOpen"
      menuItems="menuState.menuItems"
      position="menuState.position"
      onClose="() => this.menuState.isOpen=false"/>
    <t t-set="gridSize" t-value="env.model.getters.getMaxViewportSize(env.model.getters.getActiveSheet())"/>
    <FiguresContainer model="props.model" sidePanelIsOpen="props.sidePanelIsOpen" onFigureDeleted="() => this.focus()" />
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
  static template = TEMPLATE;
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

  private menuState!: MenuState;
  private vScrollbarRef!: Ref<HTMLElement>;
  private hScrollbarRef!: Ref<HTMLElement>;
  private gridRef!: Ref<HTMLElement>;
  private vScrollbar!: ScrollBar;
  private hScrollbar!: ScrollBar;
  private canvas!: Ref<HTMLElement>;
  private currentSheet!: UID;
  private clickedCol!: number;
  private clickedRow!: number;

  // last string that was cut or copied. It is necessary so we can make the
  // difference between a paste coming from the sheet itself, or from the
  // os clipboard
  private clipBoardString!: string;
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
    this.canvas = useRef("canvas");
    this.vScrollbar = new ScrollBar(this.vScrollbarRef.el, "vertical");
    this.hScrollbar = new ScrollBar(this.hScrollbarRef.el, "horizontal");
    this.currentSheet = this.env.model.getters.getActiveSheetId();
    this.clickedCol = 0;
    this.clickedRow = 0;
    this.clipBoardString = "";
    this.hoveredCell = useCellHovered(this.env, () =>
      this.env.model.getters.getActiveSnappedViewport()
    );

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

  get errorTooltip() {
    const { col, row } = this.hoveredCell;
    if (col === undefined || row === undefined) {
      return { isOpen: false };
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.env.model.getters.getMainCell(sheetId, col, row);
    const cell = this.env.model.getters.getCell(sheetId, mainCol, mainRow);

    if (cell && cell.evaluated.type === CellValueType.error) {
      const viewport = this.env.model.getters.getActiveSnappedViewport();
      const [x, y, width] = this.env.model.getters.getRect(
        { left: col, top: row, right: col, bottom: row },
        viewport
      );
      return {
        isOpen: true,
        position: { x: x + width, y: y + TOPBAR_HEIGHT },
        text: cell.evaluated.error,
      };
    }
    return { isOpen: false };
  }

  get activeCellPosition(): Position {
    const [col, row] = this.env.model.getters.getMainCell(
      this.env.model.getters.getActiveSheetId(),
      ...this.env.model.getters.getPosition()
    );
    return { col, row };
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
    const [col, row] = this.env.model.getters.getBottomLeftCell(
      this.env.model.getters.getActiveSheetId(),
      ...this.env.model.getters.getPosition()
    );
    const viewport = this.env.model.getters.getActiveSnappedViewport();
    const [x, y, width, height] = this.env.model.getters.getRect(
      { left: col, top: row, right: col, bottom: row },
      viewport
    );
    return {
      position: { x, y: y + height + TOPBAR_HEIGHT },
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
    TAB: () => this.env.model.dispatch("MOVE_POSITION", { deltaX: 1, deltaY: 0 }),
    "SHIFT+TAB": () => this.env.model.dispatch("MOVE_POSITION", { deltaX: -1, deltaY: 0 }),
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
    "CTRL+A": () => this.env.model.dispatch("SELECT_ALL"),
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
      const sums = this.env.model.getters.getAutomaticSums(
        sheetId,
        mainSelectedZone,
        this.env.model.getters.getPosition()
      );
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
      const [col, row] = getNextVisibleCellCoords(sheet, 0, 0);
      this.env.model.dispatch("SELECT_CELL", { col, row });
    },
    "CTRL+END": () => {
      const sheet = this.env.model.getters.getActiveSheet();
      const col = findVisibleHeader(sheet, "cols", range(0, sheet.cols.length).reverse())!;
      const row = findVisibleHeader(sheet, "rows", range(0, sheet.rows.length).reverse())!;
      this.env.model.dispatch("SELECT_CELL", { col, row });
    },
    "SHIFT+ ": () => {
      const { cols } = this.env.model.getters.getActiveSheet();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        left: 0,
        right: cols.length - 1,
      };
      this.env.model.dispatch("SET_SELECTION", {
        anchor: this.env.model.getters.getPosition(),
        zones: [newZone],
        anchorZone: newZone,
      });
    },
    "CTRL+ ": () => {
      const { rows } = this.env.model.getters.getActiveSheet();
      const newZone = {
        ...this.env.model.getters.getSelectedZone(),
        top: 0,
        bottom: rows.length - 1,
      };
      this.env.model.dispatch("SET_SELECTION", {
        anchor: this.env.model.getters.getPosition(),
        zones: [newZone],
        anchorZone: newZone,
      });
    },
    "CTRL+SHIFT+ ": () => {
      this.env.model.dispatch("SELECT_ALL");
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
    if (
      !this.env.model.getters.isSelectingForComposer() &&
      !this.env.model.getters.getSelectedFigureId()
    ) {
      this.canvas.el!.focus();
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
        height: currentHeight - HEADER_HEIGHT,
        width: currentWidth - HEADER_WIDTH,
      });
    }
  }

  onScroll() {
    const { offsetX, offsetY } = this.env.model.getters.getActiveViewport();
    if (offsetX !== this.hScrollbar.scroll || offsetY !== this.vScrollbar.scroll) {
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
    const sheet = this.env.model.getters.getActiveSheet();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSnappedViewport();
    return {
      left: sheet.cols[zone.right].end - AUTOFILL_EDGE_LENGTH / 2 + HEADER_WIDTH - offsetX,
      top: sheet.rows[zone.bottom].end - AUTOFILL_EDGE_LENGTH / 2 + HEADER_HEIGHT - offsetY,
    };
  }

  drawGrid() {
    //reposition scrollbar
    const { offsetX, offsetY } = this.env.model.getters.getActiveViewport();
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
      viewport: this.env.model.getters.getActiveViewport(),
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
    const rect = this.gridEl.getBoundingClientRect();
    const x = ev.pageX - rect.left;
    const y = ev.pageY - rect.top;
    return [x, y];
  }

  getCartesianCoordinates(ev: MouseEvent): [number, number] {
    const [x, y] = this.getCoordinates(ev);
    const { left, top } = this.env.model.getters.getActiveSnappedViewport();
    const colIndex = this.env.model.getters.getColIndex(x, left);
    const rowIndex = this.env.model.getters.getRowIndex(y, top);
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

    const sheetId = this.env.model.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.env.model.getters.getMainCell(sheetId, col, row);
    const cell = this.env.model.getters.getCell(sheetId, mainCol, mainRow);
    if (!cell?.isLink()) {
      this.closeLinkEditor();
    }

    this.env.model.dispatch(ev.ctrlKey ? "START_SELECTION_EXPANSION" : "START_SELECTION");
    if (ev.shiftKey) {
      this.env.model.dispatch("ALTER_SELECTION", { cell: [col, row] });
    } else {
      this.env.model.dispatch("SELECT_CELL", { col, row });
      this.checkSheetChanges();
    }
    let prevCol = col;
    let prevRow = row;

    let isEdgeScrolling: boolean = false;
    let timeOutId: any = null;
    let timeoutDelay: number = 0;

    let currentEv: MouseEvent;

    const sheet = this.env.model.getters.getActiveSheet();

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
        col = this.env.model.getters.getColIndex(x, left);
        col = col === -1 ? prevCol : col;
      }

      if (rowEdgeScroll.canEdgeScroll) {
        row = rowEdgeScroll.direction > 0 ? bottom : top - 1;
      } else {
        row = this.env.model.getters.getRowIndex(y, top);
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
        this.env.model.dispatch("ALTER_SELECTION", { cell: [col, row] });
      }
      if (isEdgeScrolling) {
        const offsetX = sheet.cols[left + colEdgeScroll.direction].start;
        const offsetY = sheet.rows[top + rowEdgeScroll.direction].start;
        this.env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
        timeOutId = setTimeout(() => {
          timeOutId = null;
          onMouseMove(currentEv);
        }, Math.round(timeoutDelay));
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      clearTimeout(timeOutId);
      this.env.model.dispatch(ev.ctrlKey ? "PREPARE_SELECTION_EXPANSION" : "STOP_SELECTION");
      this.canvas.el!.removeEventListener("mousemove", onMouseMove);
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

  processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    const deltaX = ev.shiftKey ? -1 : 1;
    this.env.model.dispatch("MOVE_POSITION", { deltaX, deltaY: 0 });
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
      const oldZone = this.env.model.getters.getSelectedZone();
      this.env.model.dispatch("ALTER_SELECTION", { delta });
      const newZone = this.env.model.getters.getSelectedZone();
      const viewport = this.env.model.getters.getActiveSnappedViewport();
      const sheet = this.env.model.getters.getActiveSheet();
      const [col, row] = findCellInNewZone(oldZone, newZone, viewport);

      const { left, right, top, bottom, offsetX, offsetY } = viewport;
      const newOffsetX =
        col < left || col > right - 1 ? sheet.cols[left + delta[0]].start : offsetX;
      const newOffsetY = row < top || row > bottom - 1 ? sheet.rows[top + delta[1]].start : offsetY;
      if (newOffsetX !== offsetX || newOffsetY !== offsetY) {
        this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        });
      }
    } else {
      this.env.model.dispatch("MOVE_POSITION", { deltaX: delta[0], deltaY: delta[1] });
    }

    if (this.env.model.getters.isPaintingFormat()) {
      this.env.model.dispatch("PASTE", {
        target: this.env.model.getters.getSelectedZones(),
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
      this.env.model.dispatch("STOP_EDITION");
      this.env.model.dispatch("SELECT_CELL", { col, row });
    } else {
      if (this.env.model.getters.getActiveCols().has(col)) {
        type = "COL";
      } else if (this.env.model.getters.getActiveRows().has(row)) {
        type = "ROW";
      }
    }
    this.toggleContextMenu(type, ev.offsetX, ev.offsetY);
  }

  toggleContextMenu(type: ContextMenuType, x: number, y: number) {
    this.closeLinkEditor();
    this.menuState.isOpen = true;
    this.menuState.position = { x, y: y + TOPBAR_HEIGHT };
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
    const type = cut ? "CUT" : "COPY";
    const target = this.env.model.getters.getSelectedZones();
    this.env.model.dispatch(type, { target });
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
}
