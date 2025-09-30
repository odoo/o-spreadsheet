import { CellPosition, Color, Style } from "@odoo/o-spreadsheet-engine";
import { Component } from "@odoo/owl";
import { TEXT_BODY_MUTED } from "../../../constants";
import { blendColors } from "../../../helpers";
import { Store, useStore } from "../../../store_engine";
import { SortDirection, SpreadsheetChildEnv } from "../../../types";
import { cssPropertiesToCss } from "../../helpers";
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

  get verticalJustifyClass() {
    const cellStyle = this.env.model.getters.getCellComputedStyle(this.props.position);
    switch (cellStyle.verticalAlign) {
      case "top":
        return "justify-content-start";
      case "middle":
        return "justify-content-center";
      case "bottom":
      default:
        return "justify-content-end";
    }
  }

  private getBackgroundColor(cellStyle: Style): Color {
    const overlayColor = this.hoveredTableStore.overlayColors.get(this.props.position);
    if (overlayColor) {
      return blendColors(cellStyle.fillColor || "#FFFFFF", overlayColor);
    }
    return cellStyle.fillColor || "#FFFFFF";
  }
}
