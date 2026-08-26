import { signal, useProps } from "@odoo/owl";
import { Rect } from "../../types/rendering";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { types } from "../props_validation";
import { SpreadsheetComponent } from "../spreadsheet/spreadsheet_component";
import { ColorPicker } from "./color_picker";

export class ColorPickerWidget extends SpreadsheetComponent {
  static template = "o-spreadsheet-ColorPickerWidget";
  static components = { ColorPicker };

  protected props = useProps({
    currentColor: types.string().optional(),
    toggleColorPicker: types.function(),
    showColorPicker: types.boolean(),
    onColorPicked: types.function<(color: string) => void>(),
    icon: types.string(),
    title: types.string().optional(),
    disabled: types.boolean().optional(),
    dropdownMaxHeight: types.Pixel().optional(),
    class: types.string().optional(),
  });

  colorPickerButtonRef = signal.ref();

  get iconStyle() {
    return this.props.currentColor
      ? `border-color: ${this.props.currentColor}`
      : "border-bottom-style: hidden";
  }

  get colorPickerAnchorRect(): Rect {
    return getElBoundingRect(this.colorPickerButtonRef());
  }
}
