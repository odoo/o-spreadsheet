import { Component, useRef } from "@odoo/owl";
import { Pixel, Rect, SpreadsheetChildEnv } from "../../types";
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

  colorPickerButtonRef = useRef("colorPickerButton");

  get iconStyle() {
    return this.props.currentColor
      ? `border-color: ${this.props.currentColor}`
      : "border-bottom-style: hidden";
  }

  get colorPickerAnchorRect(): Rect {
    const button = this.colorPickerButtonRef.el!;
    const buttonRect = button.getBoundingClientRect();
    return {
      x: buttonRect.x,
      y: buttonRect.y,
      width: buttonRect.width,
      height: buttonRect.height,
    };
  }
}
