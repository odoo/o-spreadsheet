import { Component } from "@odoo/owl";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { GridCellIcon } from "../../grid_cell_icon/grid_cell_icon";
import { FilterIcon } from "../filter_icon/filter_icon";

export class FilterIconsOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterIconsOverlay";

  static components = {
    GridCellIcon,
    FilterIcon,
  };

  getFilterHeadersPositions(): CellPosition[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getFilterHeaders(sheetId);
  }
}
