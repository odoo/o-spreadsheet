import { useProps } from "@odoo/owl";

import { types } from "../../../props_validation";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";
interface Choice {
  value: string;
  label: string;
  icon?: string;
}

export class BadgeSelection extends SpreadsheetComponent {
  static template = "o-spreadsheet.BadgeSelection";

  protected props = useProps({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<(value: string) => void>(),
    selectedValue: types.string(),
  });
}
