import { SELECTION_BORDER_COLOR } from "../../constants";
import { PropsOf } from "../../types/props_of";
import { Highlight } from "../highlight/highlight/highlight";

import { SpreadsheetComponent } from "../spreadsheet/spreadsheet_component";
export class Selection extends SpreadsheetComponent {
  static template = "o-spreadsheet-Selection";
  static components = { Highlight };

  get highlightProps(): PropsOf<Highlight> {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zone = this.env.model.getters.getUnboundedZone(
      sheetId,
      this.env.model.getters.getSelectedZone()
    );
    const range = this.env.model.getters.getRangeFromZone(sheetId, zone);
    return { range, color: SELECTION_BORDER_COLOR };
  }
}
