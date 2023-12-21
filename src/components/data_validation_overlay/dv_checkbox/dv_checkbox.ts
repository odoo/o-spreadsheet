import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH } from "../../../constants";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";

const CHECKBOX_WIDTH = 15;
const MARGIN = (GRID_ICON_EDGE_LENGTH - CHECKBOX_WIDTH) / 2;

css/* scss */ `
  .o-dv-checkbox {
    box-sizing: border-box !important;
    width: ${CHECKBOX_WIDTH}px;
    height: ${CHECKBOX_WIDTH}px;
    accent-color: #808080;
    margin: ${MARGIN}px;
  }
`;

interface Props {
  cellPosition: CellPosition;
}

export class DataValidationCheckbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationCheckbox";
  static props = {
    cellPosition: Object,
  };

  onCheckboxChange(ev: Event) {
    const newValue = (ev.target as HTMLInputElement).checked;
    const { sheetId, col, row } = this.props.cellPosition;
    const cellContent = newValue ? "TRUE" : "FALSE";
    this.env.model.dispatch("UPDATE_CELL", { sheetId, col, row, content: cellContent });
  }

  get checkBoxValue(): boolean {
    return !!this.env.model.getters.getEvaluatedCell(this.props.cellPosition).value;
  }

  get isDisabled(): boolean {
    const cell = this.env.model.getters.getCell(this.props.cellPosition);
    return !!cell?.isFormula;
  }
}
