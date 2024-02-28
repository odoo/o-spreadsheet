import { Component } from "@odoo/owl";
import { CellPosition, CellValueType, SpreadsheetChildEnv } from "../../types";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";
import { DataValidationCheckbox } from "./dv_checkbox/dv_checkbox";
import { DataValidationListIcon } from "./dv_list_icon/dv_list_icon";

export class DataValidationOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationOverlay";
  static props = {};
  static components = { GridCellIcon, DataValidationCheckbox, DataValidationListIcon };

  get checkBoxCellPositions(): CellPosition[] {
    const visibleCols = this.env.model.getters.getSheetViewVisibleCols();
    const visibleRows = this.env.model.getters.getSheetViewVisibleRows();
    const sheetId = this.env.model.getters.getActiveSheetId();

    const positions: CellPosition[] = [];
    for (const col of visibleCols) {
      for (const row of visibleRows) {
        const position = { sheetId, col, row };
        const mainPosition = this.env.model.getters.getMainCellPosition(position);
        if (mainPosition.row !== row || mainPosition.col !== col) {
          continue;
        }
        const rule = this.env.model.getters.getValidationRuleForCell(position);
        const cell = this.env.model.getters.getEvaluatedCell(position);
        if (
          rule?.criterion.type === "isBoolean" &&
          (typeof cell?.value === "boolean" || cell.type === CellValueType.empty) &&
          !this.env.model.getters.isReadonly()
        ) {
          positions.push(position);
        }
      }
    }
    return positions;
  }

  get listIconsCellPositions(): CellPosition[] {
    const visibleCols = this.env.model.getters.getSheetViewVisibleCols();
    const visibleRows = this.env.model.getters.getSheetViewVisibleRows();
    const sheetId = this.env.model.getters.getActiveSheetId();

    const positions: CellPosition[] = [];
    for (const col of visibleCols) {
      for (const row of visibleRows) {
        const position = { sheetId, col, row };
        const mainPosition = this.env.model.getters.getMainCellPosition(position);
        if (mainPosition.row !== row || mainPosition.col !== col) {
          continue;
        }
        const rule = this.env.model.getters.getValidationRuleForCell(position);
        if (
          rule &&
          (rule.criterion.type === "isValueInList" || rule.criterion.type === "isValueInRange") &&
          rule.criterion.displayStyle === "arrow"
        ) {
          positions.push(position);
        }
      }
    }
    return positions;
  }
}
