import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { positionToZone } from "../../helpers";
import { cssPropertiesToCss } from "../helpers";

interface Props {}

export class PivotOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotOverlay";
  static props = { "*": Object }; // ADRM TODO

  get overlayStyle() {
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
    for (const { position } of this.env.model.getters.getAllPivotArrayFormulas()) {
      if (position.sheetId === sheetId) {
        return position;
      }
    }
    return undefined;
  }
}
