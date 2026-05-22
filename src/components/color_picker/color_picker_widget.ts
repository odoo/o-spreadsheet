import { signal } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { Pixel } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { ColorPicker } from "./color_picker";

interface Props {
  currentColor: string | undefined;
  toggleColorPicker: () => void;
  showColorPicker: boolean;
  onColorPicked: (color: string) => void;
  icon: string;
  title?: string;
  disabled?: boolean;
  dropdownMaxHeight?: Pixel;
  class?: string;
}

export class ColorPickerWidget extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorPickerWidget";
  static props = {
    currentColor: { type: String, optional: true },
    toggleColorPicker: Function,
    showColorPicker: Boolean,
    onColorPicked: Function,
    icon: String,
    title: { type: String, optional: true },
    disabled: { type: Boolean, optional: true },
    dropdownMaxHeight: { type: Number, optional: true },
    class: { type: String, optional: true },
  };
  static components = { ColorPicker };

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
