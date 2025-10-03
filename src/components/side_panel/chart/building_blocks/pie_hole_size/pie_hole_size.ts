import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { clip } from "../../../../../helpers";
import { NumberInput } from "../../../../number_input/number_input";
import { Section } from "../../../components/section/section";

interface Props {
  onValueChange: (value: number) => void;
  value: number;
}

export class PieHoleSize extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.PieHoleSize";
  static components = { Section, NumberInput };
  static props = { onValueChange: Function, value: Number };

  onChange(value: string) {
    if (!isNaN(Number(value))) {
      this.props.onValueChange(clip(Number(value), 0, 95));
    }
  }
}
