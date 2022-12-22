import { Component, onMounted, onWillUnmount, useRef } from "@odoo/owl";
import {
  DOMCoordinates,
  DOMDimension,
  HeaderIndex,
  Pixel,
  Position,
  Ref,
  SpreadsheetChildEnv,
} from "../../types";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { isCtrlKey } from "../helpers/dom_helpers";
import { useInterval } from "../helpers/time_hooks";

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

  onMounted(() => {
    const grid = gridRef.el!;
    grid.addEventListener("mousemove", updateMousePosition);
    grid.addEventListener("mouseleave", pause);
    grid.addEventListener("mouseenter", resume);
    grid.addEventListener("mousedown", recompute);
  });

  onWillUnmount(() => {
    const grid = gridRef.el!;
    grid.removeEventListener("mousemove", updateMousePosition);
    grid.removeEventListener("mouseleave", pause);
    grid.removeEventListener("mouseenter", resume);
    grid.removeEventListener("mousedown", recompute);
  });

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

  onMounted(() => {
    gridRef.el!.addEventListener("touchstart", onTouchStart);
    gridRef.el!.addEventListener("touchend", onTouchEnd);
    gridRef.el!.addEventListener("touchmove", onTouchMove);
  });

  onWillUnmount(() => {
    gridRef.el!.removeEventListener("touchstart", onTouchStart);
    gridRef.el!.removeEventListener("touchend", onTouchEnd);
    gridRef.el!.removeEventListener("touchmove", onTouchMove);
  });
}

interface Props {
  onCellHovered: (position: Partial<Position>) => void;
  onCellDoubleClicked: (col: HeaderIndex, row: HeaderIndex) => void;
  onCellClicked: (
    col: HeaderIndex,
    row: HeaderIndex,
    modifiers: { addZone: boolean; expandZone: boolean }
  ) => void;
  onCellRightClicked: (col: HeaderIndex, row: HeaderIndex, coordinates: DOMCoordinates) => void;
  onGridResized: (dimension: DOMDimension) => void;
  onGridMoved: (deltaX: Pixel, deltaY: Pixel) => void;
  gridOverlayDimensions: string;
  onFigureDeleted: () => void;
}

export class GridOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridOverlay";
  static components = { FiguresContainer };
  static defaultProps = {
    onCellHovered: () => {},
    onCellDoubleClicked: () => {},
    onCellClicked: () => {},
    onCellRightClicked: () => {},
    onGridResized: () => {},
    onFigureDeleted: () => {},
  };
  private gridOverlay!: Ref<HTMLElement>;

  setup() {
    this.gridOverlay = useRef("gridOverlay");
    useCellHovered(this.env, this.gridOverlay, this.props.onCellHovered);
    const resizeObserver = new ResizeObserver(() => {
      this.props.onGridResized({
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
      const { scrollY } = this.env.model.getters.getActiveSheetDOMScrollInfo();
      return scrollY > 0;
    });
  }

  get gridOverlayEl(): HTMLElement {
    if (!this.gridOverlay.el) {
      throw new Error("GridOverlay el is not defined.");
    }
    return this.gridOverlay.el;
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
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
    const colIndex = this.env.model.getters.getColIndex(ev.offsetX);
    const rowIndex = this.env.model.getters.getRowIndex(ev.offsetY);
    return [colIndex, rowIndex];
  }
}

GridOverlay.props = {
  onCellHovered: { type: Function, optional: true },
  onCellDoubleClicked: { type: Function, optional: true },
  onCellClicked: { type: Function, optional: true },
  onCellRightClicked: { type: Function, optional: true },
  onGridResized: { type: Function, optional: true },
  onFigureDeleted: { type: Function, optional: true },
  onGridMoved: Function,
  gridOverlayDimensions: String,
};
