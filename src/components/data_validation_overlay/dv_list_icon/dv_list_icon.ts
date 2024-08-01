import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH } from "../../../constants";
import type { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";

const ICON_WIDTH = 13;

css/* scss */ `
  .o-dv-list-icon {
    color: #808080;
    border-radius: 1px;
    height: ${GRID_ICON_EDGE_LENGTH}px;
    width: ${GRID_ICON_EDGE_LENGTH}px;

    &:hover {
      color: #ffffff;
      background-color: #808080;
    }

    svg {
      width: ${ICON_WIDTH}px;
      height: ${ICON_WIDTH}px;
    }
  }
`;

interface Props {
  cellPosition: CellPosition;
}

export class DataValidationListIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationListIcon";

  onClick() {
    const { col, row } = this.props.cellPosition;
    this.env.model.selection.selectCell(col, row);
    this.env.startCellEdition();
  }
}

DataValidationListIcon.props = {
  cellPosition: Object,
};
