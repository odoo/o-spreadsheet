import { TEXT_BODY_MUTED } from "../../../constants";
import { blendColors } from "../../../helpers/color";
import { computeTextFontSizeInPixels } from "../../../helpers/text_helper";
import { useStore } from "../../../store_engine/store_hooks";
import { Color, Style } from "../../../types/misc";
import { Store } from "../../../types/store_engine";
import { cssPropertiesToCss } from "../../helpers/css";

import { useProps } from "@odoo/owl";
import { CellHoverOverlayStore } from "../../../stores/cell_hover_overlay_store";
import { types } from "../../props_validation";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";

export class ClickableCellSortIcon extends SpreadsheetComponent {
  static template = "o-spreadsheet-ClickableCellSortIcon";

  protected props = useProps({
    position: types.CellPosition(),
    sortDirection: types.or([types.SortDirection, types.literal("none")]),
  });
  private hoveredCellOverlayStore!: Store<CellHoverOverlayStore>;

  setup(): void {
    this.hoveredCellOverlayStore = useStore(CellHoverOverlayStore);
  }

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
    const overlayColor = this.hoveredCellOverlayStore.overlayColors.get(this.props.position);
    if (overlayColor) {
      return blendColors(cellStyle.fillColor || "#FFFFFF", overlayColor);
    }
    return cellStyle.fillColor || "#FFFFFF";
  }
}
