import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH, TEXT_BODY_MUTED } from "../../../constants";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers";

const ICON_WIDTH = 13;

css/* scss */ `
  .o-dv-list-icon {
    color: ${TEXT_BODY_MUTED};
    border-radius: 1px;
    height: ${GRID_ICON_EDGE_LENGTH}px;
    width: ${GRID_ICON_EDGE_LENGTH}px;

    &:hover {
      color: #ffffff;
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
  static props = {
    cellPosition: Object,
  };

  onClick() {
    const { col, row } = this.props.cellPosition;
    this.env.model.selection.selectCell(col, row);
    this.env.startCellEdition();
  }

  get chipStyle() {
    const style = this.env.model.getters.getDataValidationCellStyle(this.props.cellPosition);
    return cssPropertiesToCss({
      color: style?.textColor,
    });
  }
}
