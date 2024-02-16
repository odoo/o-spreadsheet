import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers/css";

interface Props {
  label?: string;
  value: boolean;
  className?: string;
  name?: string;
  title?: string;
  onChange: (value: boolean) => void;
}

css/* scss */ `
  .o-checkbox {
    display: flex;
    justify-items: center;
    input {
      margin-right: 5px;
    }
  }
`;

export class Checkbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Checkbox";
  static props = {
    label: { type: String, optional: true },
    value: { type: Boolean, optional: true },
    className: { type: String, optional: true },
    name: { type: String, optional: true },
    title: { type: String, optional: true },
    onChange: Function,
  };
  static defaultProps = { value: false };

  onChange(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).checked;
    this.props.onChange(value);
  }
}
