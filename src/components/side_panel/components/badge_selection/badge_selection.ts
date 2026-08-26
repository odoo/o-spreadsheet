import { useProps } from "@odoo/owl";
import { SpreadsheetComponentEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
import { types } from "../../../props_validation";
interface Choice {
  value: string;
  label: string;
  icon?: string;
}

export class BadgeSelection extends Component<SpreadsheetComponentEnv> {
  static template = "o-spreadsheet.BadgeSelection";

  protected props = useProps({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<(value: string) => void>(),
    selectedValue: types.string(),
  });
}
