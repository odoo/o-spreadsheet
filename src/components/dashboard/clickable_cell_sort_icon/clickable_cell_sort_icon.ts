import { props } from "@odoo/owl";
import { TEXT_BODY_MUTED } from "../../../constants";
import { blendColors } from "../../../helpers/color";
import { computeTextFontSizeInPixels } from "../../../helpers/text_helper";
import { Component } from "../../../owl3_compatibility_layer";
import { useStore } from "../../../store_engine/store_hooks";
import { Color, Style } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { cssPropertiesToCss } from "../../helpers/css";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";
import { HoveredTableStore } from "../../tables/hovered_table_store";

export class ClickableCellSortIcon extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClickableCellSortIcon";

  protected props = props({
    position: types.CellPosition(),
    sortDirection: types.or([types.SortDirection, types.literal("none")]),
  });
  private hoveredTableStore!: Store<HoveredTableStore>;

  private model = useModel();

  setup(): void {
    this.hoveredTableStore = useStore(HoveredTableStore);
  }

  get style() {
    const cellStyle = this.model().getters.getCellComputedStyle(this.props.position);
    const size = computeTextFontSizeInPixels(cellStyle);
    return cssPropertiesToCss({
      height: `${size}px`,
      width: `${size}px`,
      color: cellStyle.textColor || TEXT_BODY_MUTED,
      "background-color": this.getBackgroundColor(cellStyle),
    });
  }

  get verticalJustifyClass() {
    const cellStyle = this.model().getters.getCellComputedStyle(this.props.position);
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
