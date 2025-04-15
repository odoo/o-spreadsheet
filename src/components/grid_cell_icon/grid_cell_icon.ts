import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-grid-cell-icon {
    width: ${GRID_ICON_EDGE_LENGTH}px;
    height: ${GRID_ICON_EDGE_LENGTH}px;
  }
`;

export interface GridCellIconProps {
  x: number;
  y: number;
}

export class GridCellIcon extends Component<GridCellIconProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIcon";
  static props = {
    x: Number,
    y: Number,
    slots: Object,
  };

  get iconStyle(): string {
    return cssPropertiesToCss({
      top: `${this.props.y}px`,
      left: `${this.props.x}px`,
    });
  }
}
