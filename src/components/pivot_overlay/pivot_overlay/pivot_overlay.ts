import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { positionToZone } from "../../../helpers";
import { cssPropertiesToCss } from "../../helpers";
import { PivotFacet } from "../pivot_facet/pivot_facet";

interface Props {}

export class PivotOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotOverlay";
  static props = { "*": Object }; // ADRM TODO
  static components = { PivotFacet };

  setup() {
    const overlayRef = useRef("pivotOverlay");
    useEffect(() => {
      if (!overlayRef.el) {
        return;
      }
      const position = this.pivotFormulaPosition!; // ADRM TODO
      const rect = this.env.model.getters.getRect(positionToZone(position));

      let heightOffset = 0;
      const horizontalOverlays = overlayRef.el.querySelectorAll(
        ".o-pivot-measures, .o-pivot-columns"
      );
      for (const horizontalOverlay of horizontalOverlays) {
        heightOffset = Math.max(heightOffset, horizontalOverlay.getBoundingClientRect().height);
      }

      let widthOffset = 0;
      const verticalOverlays = overlayRef.el.querySelectorAll(".o-pivot-rows");
      for (const verticalOverlay of verticalOverlays) {
        widthOffset = Math.max(widthOffset, verticalOverlay.getBoundingClientRect().width);
      }

      const y = Math.max(rect.y - heightOffset, 0);
      const x = Math.max(rect.x - widthOffset, 0);

      overlayRef.el.style.left = x + "px";
      overlayRef.el.style.top = y + "px";
    });
  }

  get overlayStyle() {
    return "";
    const position = this.pivotFormulaPosition!; // ADRM TODO

    const rect = this.env.model.getters.getVisibleRect(positionToZone(position));

    const y = Math.max(rect.y - 10, 0); // ADRM TODO: replace 10 by overlay size ?
    const x = Math.max(rect.x - 10, 0);

    return cssPropertiesToCss({
      left: x + "px",
      top: y + "px",
    });
  }

  get pivotFormulaPosition() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    for (const { position, pivotId } of this.env.model.getters.getAllPivotArrayFormulas()) {
      if (position.sheetId === sheetId && pivotId === this.pivotId) {
        return position;
      }
    }
    return undefined;
    this.definition.measures;
  }

  get pivotId() {
    return "1"; // ADRM TODO props
  }

  get definition() {
    return this.env.model.getters.getPivot(this.pivotId).definition;
  }
}
