import { Component } from "@odoo/owl";
import { GRID_ICON_EDGE_LENGTH, TEXT_BODY_MUTED } from "../../../constants";
import { darkenColor } from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { HoveredCellStore } from "../../grid/immediate_hovered_cell_store";
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
  hoveredCellStore!: Store<HoveredCellStore>;

  setup() {
    this.hoveredCellStore = useStore(HoveredCellStore);
  }

  onClick() {
    const { col, row } = this.props.cellPosition;
    this.env.model.selection.selectCell(col, row);
    this.env.startCellEdition();
  }

  get chipStyle() {
    const style = this.env.model.getters.getDataValidationCellStyle(this.props.cellPosition);
    const isHovered =
      this.hoveredCellStore.col === this.props.cellPosition.col &&
      this.hoveredCellStore.row === this.props.cellPosition.row;
    const shadowColor = darkenColor(style?.textColor || TEXT_BODY_MUTED, 0.2);
    return cssPropertiesToCss({
      color: style?.textColor,
      filter: isHovered ? `drop-shadow(0 0 2px ${shadowColor})` : "",
    });
  }
}
