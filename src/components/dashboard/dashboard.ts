import { Component, useRef, useState } from "@odoo/owl";
import { isInside } from "../../helpers/index";
import {
  DOMCoordinates,
  DOMDimension,
  HeaderIndex,
  Pixel,
  Position,
  SpreadsheetChildEnv,
} from "../../types/index";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useAbsolutePosition } from "../helpers/position_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { Popover } from "../popover/popover";
import { HorizontalScrollBar, VerticalScrollBar } from "../scrollbar/";

interface Props {}

export class SpreadsheetDashboard extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static components = {
    GridOverlay,
    GridPopover,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
  };

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Partial<Position>;

  setup() {
    const gridRef = useRef("grid");
    this.canvasPosition = useAbsolutePosition(gridRef);
    this.hoveredCell = useState({ col: undefined, row: undefined });

    useGridDrawing("canvas", this.env.model, () => this.env.model.getters.getSheetViewDimension());
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.col = undefined;
      this.hoveredCell.row = undefined;
    });
  }

  onCellHovered({ col, row }) {
    this.hoveredCell.col = col;
    this.hoveredCell.row = row;
  }

  get gridContainer() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { right } = this.env.model.getters.getSheetZone(sheetId);
    const { end } = this.env.model.getters.getColDimensions(sheetId, right);
    return `
      max-width: ${end}px;
    `;
  }

  get gridOverlayDimensions() {
    return `
      height: 100%;
      width: 100%
    `;
  }

  onClosePopover() {
    this.closeOpenedPopover();
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
    const { offsetScrollbarX, offsetScrollbarY } =
      this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: offsetScrollbarX + deltaX,
      offsetY: offsetScrollbarY + deltaY,
    });
  }

  isCellHovered(col: HeaderIndex, row: HeaderIndex): boolean {
    return this.hoveredCell.col === col && this.hoveredCell.row === row;
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  onCellClicked(col: HeaderIndex, row: HeaderIndex) {
    this.env.model.selection.selectCell(col, row);
  }

  closeOpenedPopover() {
    this.env.model.dispatch("CLOSE_CELL_POPOVER");
  }

  // ---------------------------------------------------------------------------
  // Context Menu
  // ---------------------------------------------------------------------------

  onCellRightClicked(col: HeaderIndex, row: HeaderIndex, { x, y }: DOMCoordinates) {
    const zones = this.env.model.getters.getSelectedZones();
    const lastZone = zones[zones.length - 1];
    if (!isInside(col, row, lastZone)) {
      this.env.model.selection.selectCell(col, row);
    }
    this.closeOpenedPopover();
  }

  copy(ev: ClipboardEvent) {
    this.env.model.dispatch("COPY");
    const content = this.env.model.getters.getClipboardContent();
    // TODO use env.clipboard
    // TODO add a test
    ev.clipboardData!.setData("text/plain", content);
    ev.preventDefault();
  }
}
