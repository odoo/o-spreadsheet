import { Component, useChildSubEnv, useRef } from "@odoo/owl";
import { positionToZone } from "../../helpers/zones";
import { clickableCellRegistry } from "../../registries/cell_clickable_registry";
import { Store, useStore } from "../../store_engine";
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
import { HoveredCellStore } from "../grid/hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { css, cssPropertiesToCss } from "../helpers/css";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { CellPopoverStore } from "../popover";
import { Popover } from "../popover/popover";
import { HorizontalScrollBar, VerticalScrollBar } from "../scrollbar/";

interface Props {}

interface ClickableCell {
  coordinates: Rect;
  position: Position;
  action: (position: CellPosition, env: SpreadsheetChildEnv) => void;
  tKey: string;
}

css/* scss */ `
  .o-dashboard-clickable-cell {
    position: absolute;
    cursor: pointer;
  }
`;

let tKey = 1;

export class SpreadsheetDashboard extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static components = {
    GridOverlay,
    GridPopover,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
    FilterIconsOverlay,
  };

  protected cellPopovers!: Store<CellPopoverStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<HoveredCellStore>;

  setup() {
    const gridRef = useRef("grid");
    this.canvasPosition = useAbsoluteBoundingRect(gridRef);
    this.hoveredCell = useStore(HoveredCellStore);

    useChildSubEnv({ getPopoverContainerRect: () => this.getGridRect() });
    useGridDrawing("canvas", this.env.model, () => this.env.model.getters.getSheetViewDimension());
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);
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
    const cells: ClickableCell[] = [];
    const sheetId = this.env.model.getters.getActiveSheetId();
    for (const col of this.env.model.getters.getSheetViewVisibleCols()) {
      for (const row of this.env.model.getters.getSheetViewVisibleRows()) {
        const position = { sheetId, col, row };
        const action = this.getClickableAction(position);
        if (!action) {
          continue;
        }
        let zone: Zone;
        if (this.env.model.getters.isInMerge(position)) {
          zone = this.env.model.getters.getMerge(position)!;
        } else {
          zone = positionToZone({ col, row });
        }
        const rect = this.env.model.getters.getVisibleRect(zone);
        cells.push({
          coordinates: rect,
          position: { col, row },
          action,
          // we can't rely on position only because a row or a column could
          // be inserted at any time.
          tKey: `${tKey}-${col}-${row}`,
        });
      }
    }
    tKey++;
    return cells;
  }

  getClickableAction(position: CellPosition) {
    for (const items of clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence)) {
      if (items.condition(position, this.env)) {
        return items.execute;
      }
    }
    return false;
  }

  selectClickableCell(clickableCell: ClickableCell) {
    const { position, action } = clickableCell;
    action({ ...position, sheetId: this.env.model.getters.getActiveSheetId() }, this.env);
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
}

SpreadsheetDashboard.props = {};
