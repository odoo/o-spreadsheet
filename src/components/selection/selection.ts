import { SELECTION_BORDER_COLOR } from "../../constants";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Highlight, HighlightProps } from "../highlight/highlight/highlight";

import { Component } from "../../owl3_compatibility_layer";
export class Selection extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Selection";
  static props = {};
  static components = { Highlight };

  get highlightProps(): HighlightProps {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = this.env.model.getters.getUnboundedZone(
      sheetId,
      this.env.model.getters.getSelectedZone()
    );
    const range = this.env.model.getters.getRangeFromZone(sheetId, zone);
    return { range, color: SELECTION_BORDER_COLOR };
  }
}
