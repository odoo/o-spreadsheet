import { props, signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { types } from "../props_validation";
import { ColorPicker } from "./color_picker";

export class ColorPickerWidget extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorPickerWidget";
  static components = { ColorPicker };

  protected props = props({
    "currentColor?": types.string(),
    toggleColorPicker: types.function(),
    showColorPicker: types.boolean(),
    onColorPicked: types.function<(color: string) => void>(),
    icon: types.string(),
    "title?": types.string(),
    "disabled?": types.boolean(),
    "dropdownMaxHeight?": types.Pixel(),
    "class?": types.string(),
  });

  colorPickerButtonRef = signal<HTMLElement | null>(null);

  get iconStyle() {
    return this.props.currentColor
      ? `border-color: ${this.props.currentColor}`
      : "border-bottom-style: hidden";
  }

  get colorPickerAnchorRect(): Rect {
    return getElBoundingRect(this.colorPickerButtonRef());
  }
}
