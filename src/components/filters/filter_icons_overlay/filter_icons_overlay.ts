import { Component } from "@odoo/owl";
import { CellPosition, DOMCoordinates, SpreadsheetChildEnv } from "../../../types";
import { GridCellIcon } from "../../grid_cell_icon/grid_cell_icon";
import { FilterIcon } from "../filter_icon/filter_icon";

interface Props {
  gridPosition: DOMCoordinates;
}

export class FilterIconsOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterIconsOverlay";
  static props = {
    gridPosition: { type: Object, optional: true },
  };
  static components = {
    GridCellIcon,
    FilterIcon,
  };
  static defaultProps = {
    gridPosition: { x: 0, y: 0 },
  };

  getFilterHeadersPositions(): CellPosition[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getFilterHeaders(sheetId);
  }
}
