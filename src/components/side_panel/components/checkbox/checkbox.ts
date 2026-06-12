import { props } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
import { types } from "../../../props_validation";
// FIXME Encoding version used in css
// const CHECK_SVG = /*xml*/ `
// <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>
//   <path fill='none' stroke='#FFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/>
// </svg>
// `;

export class Checkbox extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Checkbox";

  protected props = props({
    label: types.string().optional(),
    value: types.boolean().optional(false),
    className: types.string().optional(),
    name: types.string().optional(),
    title: types.string().optional(),
    disabled: types.boolean().optional(),
    onChange: types.function<(value: boolean) => void>(),
  });

  onChange(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).checked;
    this.props.onChange(value);
  }
}
