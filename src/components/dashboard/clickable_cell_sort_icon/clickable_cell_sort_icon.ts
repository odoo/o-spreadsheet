import { Component } from "@odoo/owl";
import { TEXT_BODY_MUTED } from "../../../constants";
import { blendColors } from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { CellPosition, Color, SortDirection, SpreadsheetChildEnv, Style } from "../../../types";
import { cssPropertiesToCss } from "../../helpers";
import { HoveredTableStore } from "../../tables/hovered_table_store";

interface Props {
  position: CellPosition;
  sortDirection: SortDirection | "none";
}

export class ClickableCellSortIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClickableCellSortIcon";
  static props = {
    position: Object,
    sortDirection: String,
  };
  private hoveredTableStore!: Store<HoveredTableStore>;

  setup(): void {
    this.hoveredTableStore = useStore(HoveredTableStore);
  }

  get style() {
    const cellStyle = this.env.model.getters.getCellComputedStyle(this.props.position);
    return cssPropertiesToCss({
      color: cellStyle.textColor || TEXT_BODY_MUTED,
      "background-color": this.getBackgroundColor(cellStyle),
    });
  }

  get icon() {
    switch (this.props.sortDirection) {
      case "asc":
        return "fa-sort-asc";
      case "desc":
        return "fa-sort-desc";
      default:
        return "fa-sort";
    }
  }

  getBackgroundColor(cellStyle: Style): Color {
    const overlayColor = this.hoveredTableStore.overlayColors.get(this.props.position);
    if (overlayColor) {
      return blendColors(cellStyle.fillColor || "#FFFFFF", overlayColor);
    }
    return cellStyle.fillColor || "#FFFFFF";
  }
}
