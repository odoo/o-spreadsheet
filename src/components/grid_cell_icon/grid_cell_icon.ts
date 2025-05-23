import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH } from "../../constants";
import { GridIcon } from "../../registries/icons_on_cell_registry";
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

css/* scss */ `
  .o-grid-cell-icon {
    // width: ${GRID_ICON_EDGE_LENGTH}px;
    // height: ${GRID_ICON_EDGE_LENGTH}px;
  }
`;

export interface GridCellIconProps {
  icon: GridIcon & { x: number; y: number };
}

export class GridCellIcon extends Component<GridCellIconProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIcon";
  static props = {
    icon: Object,
    slots: Object,
  };

  get iconStyle(): string {
    return cssPropertiesToCss({
      top: `${this.props.icon.y}px`,
      left: `${this.props.icon.x}px`,
      width: `${this.props.icon.size}px`,
      height: `${this.props.icon.size}px`,
    });
  }
}
