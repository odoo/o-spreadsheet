import { Component } from "@odoo/owl";
import { DEFAULT_VERTICAL_ALIGN, GRID_ICON_EDGE_LENGTH, GRID_ICON_MARGIN } from "../../constants";
import { positionToZone } from "../../helpers";
import { GridIcon } from "../../registries/icons_on_cell_registry";
import { CellPosition, Rect, SpreadsheetChildEnv, VerticalAlign } from "../../types";
import { cssPropertiesToCss } from "../helpers";

export interface GridCellIconProps {
  icon: GridIcon;
  verticalAlign?: VerticalAlign;
}

export class GridCellIcon extends Component<GridCellIconProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIcon";
  static props = {
    icon: Object,
    verticalAlign: { type: String, optional: true },
    slots: Object,
  };

  get iconStyle(): string {
    const cellPosition = this.props.icon.position;
    const merge = this.env.model.getters.getMerge(cellPosition);
    const zone = merge || positionToZone(cellPosition);
    const rect = this.env.model.getters.getVisibleRectWithoutHeaders(zone);
    const x = this.getIconHorizontalPosition(rect, cellPosition);
    const y = this.getIconVerticalPosition(rect, cellPosition);
    return cssPropertiesToCss({
      top: `${y}px`,
      left: `${x}px`,
      width: `${this.props.icon.size}px`,
      height: `${this.props.icon.size}px`,
    });
  }

  private getIconVerticalPosition(rect: Rect, cellPosition: CellPosition): number {
    const start = rect.y;
    const end = rect.y + rect.height;

    const cell = this.env.model.getters.getCell(cellPosition);
    const align = this.props.verticalAlign || cell?.style?.verticalAlign || DEFAULT_VERTICAL_ALIGN;

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

  private getIconHorizontalPosition(rect: Rect, cellPosition: CellPosition): number {
    const start = rect.x;
    const end = rect.x + rect.width;

    const cell = this.env.model.getters.getCell(cellPosition);
    const evaluatedCell = this.env.model.getters.getEvaluatedCell(cellPosition);
    const align =
      this.props.icon.horizontalAlign || cell?.style?.align || evaluatedCell.defaultAlign;

    switch (align) {
      case "right":
        return end - this.props.icon.size - this.props.icon.margin;
      case "left":
        return start + this.props.icon.margin;
      default:
        const centeringOffset = Math.floor((end - start - this.props.icon.size) / 2);
        return end - this.props.icon.size - centeringOffset;
    }
  }

  isPositionVisible(position: CellPosition): boolean {
    const rect = this.env.model.getters.getVisibleRect(positionToZone(position));
    return !(rect.width === 0 || rect.height === 0);
  }
}
