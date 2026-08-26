import { useProps } from "@odoo/owl";
import { clip } from "../../../../../helpers/misc";
import { NumberInput } from "../../../../number_input/number_input";
import { Section } from "../../../components/section/section";

import { types } from "../../../../props_validation";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
export class PieHoleSize extends SpreadsheetComponent {
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
