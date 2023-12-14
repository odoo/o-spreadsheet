import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  label?: string;
  value: boolean;
  className?: string;
  name?: string;
  onChange: (value: boolean) => void;
}

export class Checkbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Checkbox";

  onChange(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).checked;
    this.props.onChange(value);
  }
}

Checkbox.props = {
  label: { type: String, optional: true },
  value: { type: Boolean, optional: true },
  className: { type: String, optional: true },
  name: { type: String, optional: true },
  onChange: Function,
};

Checkbox.defaultProps = {
  value: false,
};
