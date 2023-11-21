import { Component } from "@odoo/owl";
import { FILTERS_COLOR, GRID_ICON_EDGE_LENGTH } from "../../../constants";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";

css/* scss */ `
  .o-filter-icon {
    color: ${FILTERS_COLOR};
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${GRID_ICON_EDGE_LENGTH}px;
    height: ${GRID_ICON_EDGE_LENGTH}px;
  }
  .o-filter-icon:hover {
    background: ${FILTERS_COLOR};
    color: #fff;
  }
`;

interface Props {
  cellPosition: CellPosition;
}

export class FilterIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterIcon";
  static props = {
    cellPosition: Object,
  };

  onClick() {
    const position = this.props.cellPosition;
    const activePopoverType = this.env.model.getters.getPersistentPopoverTypeAtPosition(position);
    if (activePopoverType && activePopoverType === "FilterMenu") {
      this.env.model.dispatch("CLOSE_CELL_POPOVER");
      return;
    }
    const { col, row } = position;
    this.env.model.dispatch("OPEN_CELL_POPOVER", {
      col,
      row,
      popoverType: "FilterMenu",
    });
  }

  get isFilterActive(): boolean {
    return this.env.model.getters.isFilterActive(this.props.cellPosition);
  }
}
