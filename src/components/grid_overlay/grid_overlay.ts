import { Component, onMounted, onWillUnmount, useExternalListener, useRef } from "@odoo/owl";
import { DEFAULT_VERTICAL_ALIGN, GRID_ICON_EDGE_LENGTH, GRID_ICON_MARGIN } from "../../constants";
import { deepEquals, positionToZone } from "../../helpers";
import { GridIcon } from "../../registries/icons_on_cell_registry";
import { Store, useStore } from "../../store_engine";
import {
  Align,
  DOMCoordinates,
  GridClickModifiers,
  HeaderIndex,
  Pixel,
  Position,
  Rect,
  Ref,
  SpreadsheetChildEnv,
  VerticalAlign,
} from "../../types";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { GridAddRowsFooter } from "../grid_add_rows_footer/grid_add_rows_footer";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";
import { css } from "../helpers";
import { getBoundingRectAsPOJO, isCtrlKey } from "../helpers/dom_helpers";
import { useRefListener } from "../helpers/listener_hook";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { useInterval } from "../helpers/time_hooks";
import { PaintFormatStore } from "../paint_format_button/paint_format_store";
import { CellPopoverStore } from "../popover";
import { HoveredIconStore } from "./hovered_icon_store";

const CURSOR_SVG = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14" height="16"><path d="M6.5.4c1.3-.8 2.9-.1 3.8 1.4l2.9 5.1c.2.4.9 1.6-.4 2.3l-1.6.9 1.8 3.1c.2.4.1 1-.2 1.2l-1.6 1c-.3.1-.9 0-1.1-.4l-1.8-3.1-1.6 1c-.6.4-1.7 0-2.2-.8L0 4.3"/><path fill="#fff" d="M9.1 2a1.4 1.1 60 0 0-1.7-.6L5.5 2.5l.9 1.6-1 .6-.9-1.6-.6.4 1.8 3.1-1.3.7-1.8-3.1-1 .6 3.8 6.6 6.8-3.98M3.9 8.8 10.82 5l.795 1.4-6.81 3.96"/></svg>
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
  onCellClicked: (
    col: HeaderIndex,
    row: HeaderIndex,
    modifiers: GridClickModifiers,
    ev: MouseEvent
  ) => void;
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
    GridAddRowsFooter,
    GridCellIcon,
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
  private hoveredIconStore!: Store<HoveredIconStore>;

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
    this.hoveredIconStore = useStore(HoveredIconStore);
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

  onMouseMove(ev: MouseEvent) {
    const icon = this.getIconAtEvent(ev);
    const hoveredIcon = icon?.id ? { id: icon.id, position: icon.position } : undefined;
    if (!deepEquals(hoveredIcon, this.hoveredIconStore.hoveredIcon)) {
      this.hoveredIconStore.setHoveredIcon(hoveredIcon);
    }
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    if (ev.target === this.gridOverlay.el && this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    const clickedIcon = this.getIconAtEvent(ev);
    if (clickedIcon?.onClick) {
      clickedIcon.onClick(clickedIcon.position, this.env);
      return;
    }
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellClicked(
      col,
      row,
      {
        expandZone: ev.shiftKey,
        addZone: isCtrlKey(ev),
      },
      ev
    );
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

  get icons() {
    const icons: GridIcon[] = [];
    for (const position of this.env.model.getters.getVisibleCellPositions()) {
      const cellIcons = this.env.model.getters.getCellIcons(position);
      icons.push(...cellIcons.filter((icon) => icon.component));
    }

    return icons;
  }

  private getIconAtEvent(ev: MouseEvent) {
    const x = ev.clientX - this.gridOverlayRect.x;
    const y = ev.clientY - this.gridOverlayRect.y;

    const [col, row] = this.getCartesianCoordinates(ev);
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cellPosition = { col, row, sheetId };

    const icons = this.env.model.getters.getCellIcons(cellPosition);
    const icon = icons.find((icon) => {
      const rect = this.getIconRect(icon);
      return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    });
    return icon;
  }

  getIconRect(icon: GridIcon): Rect {
    const cellPosition = icon.position;
    const merge = this.env.model.getters.getMerge(cellPosition);
    const zone = merge || positionToZone(cellPosition);
    const cellRect = this.env.model.getters.getVisibleRectWithoutHeaders(zone);
    const cell = this.env.model.getters.getCell(cellPosition);

    const verticalAlign = cell?.style?.verticalAlign || DEFAULT_VERTICAL_ALIGN;

    const x = this.getIconHorizontalPosition(cellRect, icon.horizontalAlign);
    const y = this.getIconVerticalPosition(cellRect, verticalAlign);
    return {
      x,
      y,
      width: GRID_ICON_EDGE_LENGTH,
      height: GRID_ICON_EDGE_LENGTH,
    };
  }

  private getIconVerticalPosition(rect: Rect, align: VerticalAlign): number {
    const start = rect.y;
    const end = rect.y + rect.height;

    switch (align) {
      case "bottom":
        return end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH;
      case "top":
        return start + GRID_ICON_MARGIN;
      default:
        const centeringOffset = Math.floor((end - start - GRID_ICON_EDGE_LENGTH) / 2);
        return end - GRID_ICON_EDGE_LENGTH - centeringOffset;
    }
  }

  private getIconHorizontalPosition(rect: Rect, align: Align): number {
    const start = rect.x;
    const end = rect.x + rect.width;

    switch (align) {
      case "right":
        return end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH;
      case "left":
        return start + GRID_ICON_MARGIN;
      default:
        const centeringOffset = Math.floor((end - start - GRID_ICON_EDGE_LENGTH) / 2);
        return end - GRID_ICON_EDGE_LENGTH - centeringOffset;
    }
  }
}
