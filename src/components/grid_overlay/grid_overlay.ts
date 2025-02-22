import { Component, onMounted, onWillUnmount, useExternalListener, useRef } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import {
  DOMCoordinates,
  GridClickModifiers,
  HeaderIndex,
  Pixel,
  Position,
  Rect,
  Ref,
  SpreadsheetChildEnv,
} from "../../types";
import { DataValidationOverlay } from "../data_validation_overlay/data_validation_overlay";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { FilterIconsOverlay } from "../filters/filter_icons_overlay/filter_icons_overlay";
import { GridAddRowsFooter } from "../grid_add_rows_footer/grid_add_rows_footer";
import { css } from "../helpers";
import { getBoundingRectAsPOJO, isCtrlKey } from "../helpers/dom_helpers";
import { useRefListener } from "../helpers/listener_hook";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { useInterval } from "../helpers/time_hooks";
import { PaintFormatStore } from "../paint_format_button/paint_format_store";
import { CellPopoverStore } from "../popover";

const CURSOR_SVG = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16"><path d="m7.5.6-6.9 4C.1 4.9 0 5.5.2 6l2 3.5c.3.5.9.6 1.4.4l6.9-4c.5-.3.6-.9.4-1.4l-.5-.9.9-.5 1.5 2.6-6.1 3.5 4 6.9 1.7-1-3-5.2 6.1-3.5L12 .3 9.4 1.8 8.9 1A1 1 0 0 0 7.5.6"/><path fill="#fff" d="M1.6 5.9a.5.5 0 0 1 .2-.7L7.4 2a.5.5 0 0 1 .7.2l1.2 2.2a.5.5 0 0 1-.2.7L3.6 8.4a.5.5 0 0 1-.7-.2"/></svg>
`;

css/* scss */ `
  .o-paint-format-cursor {
    cursor: url("data:image/svg+xml,${encodeURIComponent(CURSOR_SVG)}"), auto;
  }
`;

function useCellHovered(
  env: SpreadsheetChildEnv,
  gridRef: Ref<HTMLElement>,
  callback: (position: Partial<Position>) => void
): Partial<Position> {
  let hoveredPosition: Partial<Position> = {
    col: undefined,
    row: undefined,
  };
  const { Date } = window;
  let x: number | undefined = undefined;
  let y: number | undefined = undefined;
  let lastMoved = 0;

  function getPosition(): Position {
    if (x === undefined || y === undefined) {
      return { col: -1, row: -1 };
    }
    const col = env.model.getters.getColIndex(x);
    const row = env.model.getters.getRowIndex(y);
    return { col, row };
  }

  const { pause, resume } = useInterval(checkTiming, 200);

  function checkTiming() {
    const { col, row } = getPosition();
    const delta = Date.now() - lastMoved;
    if (delta > 300 && (col !== hoveredPosition.col || row !== hoveredPosition.row)) {
      setPosition(undefined, undefined);
    }
    if (delta > 300) {
      if (col < 0 || row < 0) {
        return;
      }
      setPosition(col, row);
    }
  }
  function updateMousePosition(e: MouseEvent) {
    if (gridRef.el === e.target) {
      x = e.offsetX;
      y = e.offsetY;
      lastMoved = Date.now();
    }
  }

  function recompute() {
    const { col, row } = getPosition();
    if (col !== hoveredPosition.col || row !== hoveredPosition.row) {
      setPosition(undefined, undefined);
    }
  }

  function onMouseLeave(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;
    const gridRect = getBoundingRectAsPOJO(gridRef.el!);

    if (y < 0 || y > gridRect.height || x < 0 || x > gridRect.width) {
      return updateMousePosition(e);
    } else {
      return pause();
    }
  }

  useRefListener(gridRef, "pointermove", updateMousePosition);
  useRefListener(gridRef, "mouseleave", onMouseLeave);
  useRefListener(gridRef, "mouseenter", resume);
  useRefListener(gridRef, "pointerdown", recompute);

  useExternalListener(window, "click", handleGlobalClick);
  function handleGlobalClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const grid = gridRef.el!;
    if (!grid.contains(target)) {
      setPosition(undefined, undefined);
    }
  }

  function setPosition(col?: number, row?: number) {
    if (col !== hoveredPosition.col || row !== hoveredPosition.row) {
      hoveredPosition.col = col;
      hoveredPosition.row = row;
      callback({ col, row });
    }
  }
  return hoveredPosition;
}

function useTouchMove(
  gridRef: Ref<HTMLElement>,
  handler: (deltaX: Pixel, deltaY: Pixel) => void,
  canMoveUp: () => boolean
) {
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

  useRefListener(gridRef, "touchstart", onTouchStart);
  useRefListener(gridRef, "touchend", onTouchEnd);
  useRefListener(gridRef, "touchmove", onTouchMove);
}

interface Props {
  onCellHovered: (position: Partial<Position>) => void;
  onCellDoubleClicked: (col: HeaderIndex, row: HeaderIndex) => void;
  onCellClicked: (col: HeaderIndex, row: HeaderIndex, modifiers: GridClickModifiers) => void;
  onCellRightClicked: (col: HeaderIndex, row: HeaderIndex, coordinates: DOMCoordinates) => void;
  onGridResized: (dimension: Rect) => void;
  onGridMoved: (deltaX: Pixel, deltaY: Pixel) => void;
  gridOverlayDimensions: string;
  onFigureDeleted: () => void;
}

export class GridOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridOverlay";
  static props = {
    onCellHovered: { type: Function, optional: true },
    onCellDoubleClicked: { type: Function, optional: true },
    onCellClicked: { type: Function, optional: true },
    onCellRightClicked: { type: Function, optional: true },
    onGridResized: { type: Function, optional: true },
    onFigureDeleted: { type: Function, optional: true },
    onGridMoved: Function,
    gridOverlayDimensions: String,
  };
  static components = {
    FiguresContainer,
    DataValidationOverlay,
    GridAddRowsFooter,
    FilterIconsOverlay,
  };
  static defaultProps = {
    onCellHovered: () => {},
    onCellDoubleClicked: () => {},
    onCellClicked: () => {},
    onCellRightClicked: () => {},
    onGridResized: () => {},
    onFigureDeleted: () => {},
  };
  private gridOverlay: Ref<HTMLElement> = useRef("gridOverlay");
  private gridOverlayRect = useAbsoluteBoundingRect(this.gridOverlay);
  private cellPopovers!: Store<CellPopoverStore>;
  private paintFormatStore!: Store<PaintFormatStore>;

  setup() {
    useCellHovered(this.env, this.gridOverlay, this.props.onCellHovered);
    const resizeObserver = new ResizeObserver(() => {
      const boundingRect = this.gridOverlayEl.getBoundingClientRect();
      this.props.onGridResized({
        x: boundingRect.left,
        y: boundingRect.top,
        height: this.gridOverlayEl.clientHeight,
        width: this.gridOverlayEl.clientWidth,
      });
    });
    onMounted(() => {
      resizeObserver.observe(this.gridOverlayEl);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });
    useTouchMove(this.gridOverlay, this.props.onGridMoved, () => {
      const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
      return scrollY > 0;
    });
    this.cellPopovers = useStore(CellPopoverStore);
    this.paintFormatStore = useStore(PaintFormatStore);
  }

  get gridOverlayEl(): HTMLElement {
    if (!this.gridOverlay.el) {
      throw new Error("GridOverlay el is not defined.");
    }
    return this.gridOverlay.el;
  }

  get style() {
    return this.props.gridOverlayDimensions;
  }

  get isPaintingFormat() {
    return this.paintFormatStore.isActive;
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    if (ev.target === this.gridOverlay.el && this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellClicked(col, row, {
      expandZone: ev.shiftKey,
      addZone: isCtrlKey(ev),
    });
  }

  onDoubleClick(ev: MouseEvent) {
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellDoubleClicked(col, row);
  }

  onContextMenu(ev: MouseEvent) {
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellRightClicked(col, row, { x: ev.clientX, y: ev.clientY });
  }

  private getCartesianCoordinates(ev: MouseEvent): [HeaderIndex, HeaderIndex] {
    const x = ev.clientX - this.gridOverlayRect.x;
    const y = ev.clientY - this.gridOverlayRect.y;

    const colIndex = this.env.model.getters.getColIndex(x);
    const rowIndex = this.env.model.getters.getRowIndex(y);
    return [colIndex, rowIndex];
  }
}
