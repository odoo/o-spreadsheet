import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../..";
import { isDefined } from "../../helpers";
import { GenericInput } from "../generic_input/generic_input";

interface Props {
  value: string;
  onChange: (value: string) => void;
  class?: string;
  id?: string;
  placeholder?: string;
  autofocus?: boolean;
  alwaysShowBorder?: boolean;
}
export class TextInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TextInput";
  static components = { GenericInput };
  static props = {
    value: String,
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
    alwaysShowBorder: { type: Boolean, optional: true },
  };

  get inputClass(): string {
    return [
      this.props.class,
      "os-input",
      this.props.alwaysShowBorder ? "o-input-border" : undefined,
    ]
      .filter(isDefined)
      .join(" ");
  }
}
