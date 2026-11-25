import { TEXT_BODY_MUTED } from "../../../constants";
import { blendColors } from "../../../helpers/color";
import { computeTextFontSizeInPixels } from "../../../helpers/text_helper";
import { Color, Style } from "../../../types/misc";
import { cssPropertiesToCss } from "../../helpers/css";
import { OSComponent } from "../../os_component";

import { usePlugin, useProps } from "@odoo/owl";
import { CellHoverOverlayPlugin } from "../../../owl_plugins/cell_hover_overlay_owl_plugin";
import { types } from "../../props_validation";

export class ClickableCellSortIcon extends OSComponent {
  static template = "o-spreadsheet-ClickableCellSortIcon";

  protected props = useProps({
    position: types.CellPosition(),
    sortDirection: types.or([types.SortDirection, types.literal("none")]),
  });
  private hoveredCellOverlayPlugin = usePlugin(CellHoverOverlayPlugin);

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

  private getBackgroundColor(cellStyle: Style): Color | undefined {
    const overlayColor = this.hoveredCellOverlayPlugin.overlayColors().get(this.props.position);
    if (overlayColor) {
      return cellStyle.fillColor ? blendColors(cellStyle.fillColor, overlayColor) : overlayColor;
    }
    return cellStyle.fillColor;
  }
}
