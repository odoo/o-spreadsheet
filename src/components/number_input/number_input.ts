import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../..";
import { GenericInput } from "../generic_input/generic_input";

interface Props {
  value: string;
  onChange: (value: string) => void;
  class?: string;
  id?: string;
  placeholder?: string;
  autofocus?: boolean;
}

export class NumberInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberInput";
  static components = { GenericInput };
  static props = {
    value: Number,
    onChange: Function,
    class: {
      type: String,
      optional: true,
    },
    id: {
      type: String,
      optional: true,
    },
    placeholder: {
      type: String,
      optional: true,
    },
    autofocus: {
      type: Boolean,
      optional: true,
    },
    min: { type: Number, optional: true },
    max: { type: Number, optional: true },
  };

  get inputClass(): string {
    return [this.props.class, "o-input"].join(" ");
  }
}
