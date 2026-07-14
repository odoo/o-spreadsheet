import { useProps } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
import { types } from "../../../props_validation";
interface Choice {
  value: unknown;
  label: string;
}

export class RadioSelection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RadioSelection";

  protected props = useProps({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<(value: unknown) => void>(),
    selectedValue: types.string(),
    name: types.string(),
    direction: types
      .or([types.literal("horizontal"), types.literal("vertical")])
      .optional("horizontal"),
  });
}
