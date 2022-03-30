import { Component, onMounted, onPatched, onWillUnmount, useRef, useState, xml } from "@odoo/owl";
import {
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  LINK_TOOLTIP_HEIGHT,
  LINK_TOOLTIP_WIDTH,
  SCROLLBAR_WIDTH,
  TOPBAR_HEIGHT,
} from "../constants";
import { ComposerSelection } from "../plugins/ui/edition";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { colMenuRegistry } from "../registries/menus/col_menu_registry";
import { rowMenuRegistry } from "../registries/menus/row_menu_registry";
import { CellValueType, Position, Ref, SpreadsheetChildEnv, UID, Viewport } from "../types/index";
import { Autofill } from "./autofill";
import { ClientTag } from "./collaborative_client_tag";
import { GridComposer } from "./composer/grid_composer";
import { ErrorToolTip } from "./error_tooltip";
import { FiguresContainer } from "./figures/container";
import { css } from "./helpers/css";
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

const ERROR_TOOLTIP_HEIGHT = 40;
const ERROR_TOOLTIP_WIDTH = 180;

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
  const gridOverlay = useRef("gridOverlay");
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
    gridOverlay.el!.addEventListener("mousemove", updateMousePosition);
    interval = setInterval(checkTiming, 200);
  });

  onWillUnmount(() => {
    gridOverlay.el!.removeEventListener("mousemove", updateMousePosition);
    clearInterval(interval);
  });
  return hoveredPosition;
}

function useTouchMove(handler: (deltaX: number, deltaY: number) => void, canMoveUp: () => boolean) {
  const canvasRef = useRef("gridOverlay");
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
    <canvas t-ref="canvas" />

    <Popover
      t-if="errorTooltip.isOpen"
      position="errorTooltip.position"
      flipHorizontalOffset="errorTooltip.cellWidth"
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
    <div
      t-ref="gridOverlay"
      tabindex="-1"
      class="o-grid-overlay"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      t-on-contextmenu="onContextMenu"/>
    <Menu t-if="menuState.isOpen"
      menuItems="menuState.menuItems"
      position="menuState.position"
      onClose="() => this.closeMenu()"/>
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

    .o-grid-overlay {
      position: absolute;
      top: ${HEADER_HEIGHT}px;
      left: ${HEADER_WIDTH}px;
      height: calc(100% - ${HEADER_HEIGHT}px);
      width: calc(100% - ${HEADER_WIDTH}px);
      outline: none;
      &:focus {
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
  onDoubleClick?: (col: number, row: number) => void;
  onCellClicked?: (col: number, row: number) => void;
}

// -----------------------------------------------------------------------------
// JS
// -----------------------------------------------------------------------------
export class GridLowLevel extends Component<Props, SpreadsheetChildEnv> {
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
  private gridOverlay!: Ref<HTMLElement>;
  private canvas!: Ref<HTMLElement>;
  private currentSheet!: UID;

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
    this.vScrollbar = new ScrollBar(this.vScrollbarRef.el, "vertical");
    this.hScrollbar = new ScrollBar(this.hScrollbarRef.el, "horizontal");
    this.currentSheet = this.env.model.getters.getActiveSheetId();
    this.hoveredCell = useCellHovered(this.env, () =>
      this.env.model.getters.getActiveSnappedViewport()
    );

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
        cellWidth: width,
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
    this.props.onCellClicked?.(col, row);
  }

  onDoubleClick(ev: MouseEvent) {
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onDoubleClick?.(col, row);
    // if (this.clickedCol === col && this.clickedRow === row) {
    //   const cell = this.env.model.getters.getActiveCell();
    //   !cell || cell.isEmpty()
    //     ? this.props.onGridComposerCellFocused()
    //     : this.props.onComposerContentFocused();
    // }
  }

  // ---------------------------------------------------------------------------
  // Context Menu
  // ---------------------------------------------------------------------------

  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const [col, row] = this.getCartesianCoordinates(ev);
    if (col < 0 || row < 0) {
      return;
    }
    // if (!isInside(col, row, lastZone)) {
    //   this.env.model.dispatch("UNFOCUS_SELECTION_INPUT");
    //   this.env.model.dispatch("STOP_EDITION");
    //   this.env.model.selection.selectCell(col, row);
    // } else {
    //   if (this.env.model.getters.getActiveCols().has(col)) {
    //     type = "COL";
    //   } else if (this.env.model.getters.getActiveRows().has(row)) {
    //     type = "ROW";
    //   }
    // }
    const x = ev.clientX;
    const y = ev.clientY;
    this.env.services.menu.open({
      position: { x, y },
      items: cellMenuRegistry
        .getAll()
        .filter((item) => !item.isVisible || item.isVisible(this.env)),
    });
    // this.menuState.isOpen = true;
    // this.menuState.position = { x, y };
    // this.menuState.menuItems = cellMenuRegistry
    //   .getAll()
    //   .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  closeMenu() {
    this.menuState.isOpen = false;
    this.focus();
  }
}
