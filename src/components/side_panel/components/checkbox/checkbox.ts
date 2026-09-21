import { Component, useProps } from "@odoo/owl";

import { types } from "../../../props_validation";

export class Checkbox extends Component {
  static template = "o-spreadsheet.Checkbox";

  protected props = useProps({
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
