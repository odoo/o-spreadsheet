<<<<<<< 22244de19425c3cb119ca67ec8b1a22982e49733
import { Component, toRaw, useChildSubEnv, useRef } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import { DOMCoordinates, DOMDimension, Pixel, Rect, SpreadsheetChildEnv } from "../../types/index";
import { HoveredCellStore } from "../grid/hovered_cell_store";
||||||| 798a886ef1f16a6053b918484954b4756d62e695
import { Component, useChildSubEnv, useRef, useState } from "@odoo/owl";
import { positionToZone } from "../../helpers/zones";
import { clickableCellRegistry } from "../../registries/cell_clickable_registry";
import {
  CellPosition,
  DOMCoordinates,
  DOMDimension,
  Pixel,
  Position,
  Rect,
  SpreadsheetChildEnv,
  Zone,
} from "../../types/index";
import { FilterIconsOverlay } from "../filters/filter_icons_overlay/filter_icons_overlay";
=======
import { Component, useChildSubEnv, useExternalListener, useRef, useState } from "@odoo/owl";
import { positionToZone } from "../../helpers/zones";
import { clickableCellRegistry } from "../../registries/cell_clickable_registry";
import {
  CellPosition,
  DOMCoordinates,
  DOMDimension,
  Pixel,
  Position,
  Rect,
  SpreadsheetChildEnv,
  Zone,
} from "../../types/index";
import { FilterIconsOverlay } from "../filters/filter_icons_overlay/filter_icons_overlay";
>>>>>>> a683cc84306242a972df2af928bc7539e3d7abf0
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { css, cssPropertiesToCss } from "../helpers/css";
import { isChildEvent } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { useTouchScroll } from "../helpers/touch_scroll_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { CellPopoverStore } from "../popover";
import { Popover } from "../popover/popover";
import { HorizontalScrollBar, VerticalScrollBar } from "../scrollbar/";
import { ClickableCell, ClickableCellsStore } from "./clickable_cell_store";

interface Props {}

css/* scss */ `
  .o-dashboard-clickable-cell {
    position: absolute;
    cursor: pointer;
  }
`;

export class SpreadsheetDashboard extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static props = {};
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
  hoveredCell!: Store<HoveredCellStore>;
  clickableCellsStore!: Store<ClickableCellsStore>;

  private gridRef = useRef("grid");

  setup() {
<<<<<<< 22244de19425c3cb119ca67ec8b1a22982e49733
    const gridRef = useRef("grid");
    this.canvasPosition = useAbsoluteBoundingRect(gridRef);
    this.hoveredCell = useStore(HoveredCellStore);
    this.clickableCellsStore = useStore(ClickableCellsStore);
||||||| 798a886ef1f16a6053b918484954b4756d62e695
    const gridRef = useRef("grid");
    this.canvasPosition = useAbsoluteBoundingRect(gridRef);
    this.hoveredCell = useState({ col: undefined, row: undefined });
=======
    this.canvasPosition = useAbsoluteBoundingRect(this.gridRef);
    this.hoveredCell = useState({ col: undefined, row: undefined });
>>>>>>> a683cc84306242a972df2af928bc7539e3d7abf0

    useChildSubEnv({ getPopoverContainerRect: () => this.getGridRect() });
    useGridDrawing("canvas", this.env.model, () => this.env.model.getters.getSheetViewDimension());
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);

    useTouchScroll(gridRef, this.moveCanvas.bind(this), () => {
      const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
      return scrollY > 0;
    });
  }

  onCellHovered({ col, row }) {
    this.hoveredCell.hover({ col, row });
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

  selectClickableCell(clickableCell: ClickableCell) {
    const { position, action } = clickableCell;
    action(position, this.env);
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
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetDOMScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX + deltaX,
      offsetY: scrollY + deltaY,
    });
  }

  private getGridRect(): Rect {
    return { ...this.canvasPosition, ...this.env.model.getters.getSheetViewDimensionWithHeaders() };
  }

  private onExternalClick(ev: MouseEvent) {
    const el = this.gridRef.el;
    if ((el && isChildEvent(el, ev)) || (ev.target as HTMLElement)?.closest(".o-popover")) {
      return;
    }
    if (this.env.model.getters.hasOpenedPopover()) {
      this.onClosePopover();
    }
  }
}
