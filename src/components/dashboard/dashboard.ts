import { Component, toRaw, useChildSubEnv, useRef } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import {
  DOMCoordinates,
  DOMDimension,
  Pixel,
  Rect,
  Ref,
  SpreadsheetChildEnv,
} from "../../types/index";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getRefBoundingRect, isMiddleClickOrCtrlClick } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useTouchScroll } from "../helpers/touch_scroll_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { CellPopoverStore } from "../popover";
import { Popover } from "../popover/popover";
import { HorizontalScrollBar, VerticalScrollBar } from "../scrollbar/";
import { ClickableCell, ClickableCellsStore } from "./clickable_cell_store";

interface Props {}

export class SpreadsheetDashboard extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static props = { getGridSize: Function };
  static components = {
    GridOverlay,
    GridPopover,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
  };

  protected cellPopovers!: Store<CellPopoverStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<DelayedHoveredCellStore>;
  clickableCellsStore!: Store<ClickableCellsStore>;

  private gridRef!: Ref<HTMLElement>;

  setup() {
    this.gridRef = useRef("grid");
    this.hoveredCell = useStore(DelayedHoveredCellStore);
    this.clickableCellsStore = useStore(ClickableCellsStore);

    useChildSubEnv({ getPopoverContainerRect: () => this.getGridRect() });
    useGridDrawing("canvas", this.env.model, () => this.env.model.getters.getSheetViewDimension());
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);

    useTouchScroll(this.gridRef, this.moveCanvas.bind(this), () => {
      const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
      return scrollY > 0;
    });
  }

  get gridContainer() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { right } = this.env.model.getters.getSheetZone(sheetId);
    const { end } = this.env.model.getters.getColDimensions(sheetId, right);
    return cssPropertiesToCss({ "max-width": `${end}px` });
  }

  get gridOverlayDimensions() {
    return cssPropertiesToCss({
      height: "100%",
      width: "100%",
    });
  }

  getCellClickableStyle(coordinates: Rect) {
    return cssPropertiesToCss({
      top: `${coordinates.y}px`,
      left: `${coordinates.x}px`,
      width: `${coordinates.width}px`,
      height: `${coordinates.height}px`,
    });
  }

  /**
   * Get all the boxes for the cell in the sheet view that are clickable.
   * This function is used to render an overlay over each clickable cell in
   * order to display a pointer cursor.
   *
   */
  getClickableCells(): ClickableCell[] {
    return toRaw(this.clickableCellsStore.clickableCells);
  }

  selectClickableCell(ev: MouseEvent, clickableCell: ClickableCell) {
    const { position, action } = clickableCell;
    action(position, this.env, isMiddleClickOrCtrlClick(ev));
  }

  onClosePopover() {
    this.cellPopovers.close();
  }

  onGridResized({ height, width }: DOMDimension) {
    this.env.model.dispatch("RESIZE_SHEETVIEW", {
      width: width,
      height: height,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
  }

  private moveCanvas(deltaX: Pixel, deltaY: Pixel) {
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX + deltaX,
      offsetY: scrollY + deltaY,
    });
  }

  private getGridRect(): Rect {
    return {
      ...getRefBoundingRect(this.gridRef),
      ...this.env.model.getters.getSheetViewDimensionWithHeaders(),
    };
  }
}
