import { useProps } from "@odoo/owl";
import { clip } from "../../../../../helpers/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { NumberInput } from "../../../../number_input/number_input";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";
export class PieHoleSize extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.PieHoleSize";
  static components = { Section, NumberInput };

  protected props = useProps({
    onValueChange: types.function<(value: number) => void>(),
    value: types.number(),
  });

  onChange(value: string) {
    if (!isNaN(Number(value))) {
      this.props.onValueChange(clip(Number(value), 0, 95));
    }
  }
}
