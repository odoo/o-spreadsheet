import { Component } from "@odoo/owl";
import { CellPosition, SpreadsheetChildEnv } from "../../types";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";
import { DataValidationCheckbox } from "./dv_checkbox/dv_checkbox";
import { DataValidationListIcon } from "./dv_list_icon/dv_list_icon";

export class DataValidationOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationOverlay";
  static props = {};
  static components = { GridCellIcon, DataValidationCheckbox, DataValidationListIcon };

  get checkBoxCellPositions(): CellPosition[] {
    return this.env.model.getters
      .getVisibleCellPositions()
      .filter(
        (position) =>
          this.env.model.getters.isCellValidCheckbox(position) &&
          !this.env.model.getters.isFilterHeader(position)
      );
  }

  get listIconsCellPositions(): CellPosition[] {
    if (this.env.model.getters.isReadonly()) {
      return [];
    }
    return this.env.model.getters
      .getVisibleCellPositions()
      .filter(
        (position) =>
          this.env.model.getters.cellHasListDataValidationIcon(position) &&
          !this.env.model.getters.isFilterHeader(position)
      );
  }
}
