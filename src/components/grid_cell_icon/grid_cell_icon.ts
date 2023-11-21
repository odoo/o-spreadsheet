import { Component } from "@odoo/owl";
import { DEFAULT_VERTICAL_ALIGN, GRID_ICON_EDGE_LENGTH, GRID_ICON_MARGIN } from "../../constants";
import { positionToZone } from "../../helpers";
import {
  Align,
  CellPosition,
  DOMCoordinates,
  SpreadsheetChildEnv,
  VerticalAlign,
} from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-grid-cell-icon {
    width: ${GRID_ICON_EDGE_LENGTH}px;
    height: ${GRID_ICON_EDGE_LENGTH}px;
  }
`;

export interface GridCellIconProps {
  cellPosition: CellPosition;
  horizontalAlign?: Align;
  verticalAlign?: VerticalAlign;
  offset?: DOMCoordinates;
}

export class GridCellIcon extends Component<GridCellIconProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIcon";
  static props = {
    cellPosition: Object,
    horizontalAlign: { type: String, optional: true },
    verticalAlign: { type: String, optional: true },
    offset: { type: Object, optional: true },
    slots: Object,
  };

  get iconStyle() {
    const x = this.getIconHorizontalPosition();
    const y = this.getIconVerticalPosition();
    return cssPropertiesToCss({
      top: `${y + (this.props.offset?.y || 0)}px`,
      left: `${x + (this.props.offset?.x || 0)}px`,
    });
  }

  private getIconVerticalPosition(): number {
    const { sheetId, row } = this.props.cellPosition;
    const merge = this.env.model.getters.getMerge(this.props.cellPosition);
    const start = this.env.model.getters.getRowDimensionsInViewport(sheetId, row).start;
    const end = this.env.model.getters.getRowDimensionsInViewport(
      sheetId,
      merge ? merge.bottom : row
    ).end;

    const cell = this.env.model.getters.getCell(this.props.cellPosition);
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

  private getIconHorizontalPosition(): number {
    const { sheetId, col } = this.props.cellPosition;
    const merge = this.env.model.getters.getMerge(this.props.cellPosition);
    const start = this.env.model.getters.getColDimensionsInViewport(sheetId, col).start;
    const end = this.env.model.getters.getColDimensionsInViewport(
      sheetId,
      merge ? merge.right : col
    ).end;

    const cell = this.env.model.getters.getCell(this.props.cellPosition);
    const evaluatedCell = this.env.model.getters.getEvaluatedCell(this.props.cellPosition);
    const align = this.props.horizontalAlign || cell?.style?.align || evaluatedCell.defaultAlign;

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

  isPositionVisible(position: CellPosition): boolean {
    const rect = this.env.model.getters.getVisibleRect(positionToZone(position));
    return !(rect.width === 0 || rect.height === 0);
  }
}
