import { TEXT_BODY_MUTED } from "../../../constants";
import { blendColors } from "../../../helpers/color";
import { computeTextFontSizeInPixels } from "../../../helpers/text_helper";
import { Color, Style } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers/css";
import { HoveredTablePlugin } from "../../owl_plugins/hovered_table_plugin";

import { plugin, props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { types } from "../../props_validation";

export class ClickableCellSortIcon extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClickableCellSortIcon";

  protected props = props({
    position: types.CellPosition(),
    sortDirection: types.or([types.SortDirection, types.literal("none")]),
  });
  private hoveredTable = plugin(HoveredTablePlugin);

  get style() {
    const cellStyle = this.env.model.getters.getCellComputedStyle(this.props.position);
    const size = computeTextFontSizeInPixels(cellStyle);
    return cssPropertiesToCss({
      height: `${size}px`,
      width: `${size}px`,
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
    const overlayColor = this.hoveredTable.overlayColors().get(this.props.position);
    if (overlayColor) {
      return blendColors(cellStyle.fillColor || "#FFFFFF", overlayColor);
    }
    return cellStyle.fillColor || "#FFFFFF";
  }
}
