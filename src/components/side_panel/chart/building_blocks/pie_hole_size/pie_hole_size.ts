import { Component } from "@odoo/owl";
import { clip, debounce } from "../../../../../helpers";
import { SpreadsheetChildEnv } from "../../../../../types";
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

  // Very short debounce to prevent up/down arrow on number input to spam the onChange
  debouncedOnChange = debounce(this.onChange.bind(this), 100);

  onChange(value: string) {
    if (!isNaN(Number(value))) {
      this.props.onValueChange(clip(Number(value), 0, 95));
    }
  }
}
