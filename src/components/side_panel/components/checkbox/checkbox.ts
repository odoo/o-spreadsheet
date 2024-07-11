import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers/css";

interface Props {
  label?: string;
  value: boolean;
  className?: string;
  name?: string;
  title?: string;
  disabled?: boolean;
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
    disabled: { type: Boolean, optional: true },
    onChange: Function,
  };
  static defaultProps = { value: false };

  onChange(ev: InputEvent) {
    const input = ev.target as HTMLInputElement;
    const value = input.checked;
    // make sure the input is always in sync with the props if the onChange doesn't trigger a re-render
    input.checked = this.props.value;
    this.props.onChange(value);
  }
}
