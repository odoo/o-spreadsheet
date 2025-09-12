import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

const CHECK_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>
  <path fill='none' stroke='#FFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/>
</svg>
`;

interface Props {
  label?: string;
  value: boolean;
  className?: string;
  name?: string;
  title?: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

export const CHECKBOX_WIDTH = 14;

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
    const value = (ev.target as HTMLInputElement).checked;
    this.props.onChange(value);
  }
}
