import { props } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
import { types } from "../../../props_validation";
interface Choice {
  value: string;
  label: string;
  icon?: string;
}

export class BadgeSelection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.BadgeSelection";

  protected props = props({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<[value: string]>([types.string()]),
    selectedValue: types.string(),
  });
}
