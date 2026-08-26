import { useProps } from "@odoo/owl";

import { types } from "../../../props_validation";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";

export class Section extends SpreadsheetComponent {
  static template = "o_spreadsheet.Section";

  protected props = useProps({
    class: types.string().optional(),
    title: types.string().optional(),
    slots: types.object(),
  });
}
