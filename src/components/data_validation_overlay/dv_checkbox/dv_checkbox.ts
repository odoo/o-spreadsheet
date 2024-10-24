import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH } from "../../../constants";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";
import { CHECKBOX_WIDTH, Checkbox } from "../../side_panel/components/checkbox/checkbox";

const MARGIN = (GRID_ICON_EDGE_LENGTH - CHECKBOX_WIDTH) / 2;

css/* scss */ `
  .o-dv-checkbox {
    box-sizing: border-box !important;
    accent-color: #808080;
    margin: ${MARGIN}px;
    /** required to prevent the checkbox position to be sensible to the font-size (affects Firefox) */
    position: absolute;
  }
`;

interface Props {
  cellPosition: CellPosition;
}

export class DataValidationCheckbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationCheckbox";
  static components = {
    Checkbox,
  };
  static props = {
    cellPosition: Object,
  };

  onCheckboxChange(value: boolean) {
    const { sheetId, col, row } = this.props.cellPosition;
    const cellContent = value ? "TRUE" : "FALSE";
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
