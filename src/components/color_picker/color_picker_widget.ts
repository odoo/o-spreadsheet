import { Component, useRef } from "@odoo/owl";
import type { Pixel, Rect, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers";
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

css/* scss */ `
  .o-color-picker-widget {
    display: flex;
    position: relative;
    align-items: center;

    .o-color-picker-button-style {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 2px;
      padding: 3px;
      border-radius: 2px;
      cursor: pointer;
      &:not([disabled]):hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    .o-color-picker-button {
      height: 30px;
      > span {
        border-bottom: 4px solid;
        height: 16px;
        margin-top: 2px;
      }

      &[disabled] {
        pointer-events: none;
        opacity: 0.3;
      }
    }
  }
`;

export class ColorPickerWidget extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorPickerWidget";
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

ColorPickerWidget.props = {
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
