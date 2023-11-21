import { Component, useState } from "@odoo/owl";
import {
  COLOR_PICKER_DEFAULTS,
  ICON_EDGE_LENGTH,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
  SEPARATOR_COLOR,
} from "../../constants";
import {
  clip,
  hexToHSLA,
  hslaToHex,
  isColorValid,
  isHSLAValid,
  isSameColor,
  toHex,
} from "../../helpers";
import { chartFontColor } from "../../helpers/figures/charts";
import { Color, HSLA, Pixel, PixelPosition, Rect } from "../../types";
import { SpreadsheetChildEnv } from "../../types/env";
import { css, cssPropertiesToCss } from "../helpers/css";
import { startDnd } from "../helpers/drag_and_drop";
import { Popover, PopoverProps } from "../popover/popover";

const LINE_VERTICAL_PADDING = 1;

const PICKER_PADDING = 8;
const ITEM_BORDER_WIDTH = 1;
const ITEM_EDGE_LENGTH = 18;
const ITEMS_PER_LINE = 10;
const MAGNIFIER_EDGE = 16;
const ITEM_GAP = 2;

const CONTENT_WIDTH =
  ITEMS_PER_LINE * (ITEM_EDGE_LENGTH + 2 * ITEM_BORDER_WIDTH) + (ITEMS_PER_LINE - 1) * ITEM_GAP;

const INNER_GRADIENT_WIDTH = CONTENT_WIDTH - 2 * ITEM_BORDER_WIDTH;
const INNER_GRADIENT_HEIGHT = CONTENT_WIDTH - 30 - 2 * ITEM_BORDER_WIDTH;

const CONTAINER_WIDTH = CONTENT_WIDTH + 2 * PICKER_PADDING;

css/* scss */ `
  .o-color-picker {
    padding: ${PICKER_PADDING}px 0;
    /** FIXME: this is useless, overiden by the popover container */
    box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
    background-color: white;
    line-height: 1.2;
    overflow-y: auto;
    overflow-x: hidden;
    width: ${CONTAINER_WIDTH}px;

    .o-color-picker-section-name {
      margin: 0px ${ITEM_BORDER_WIDTH}px;
      padding: 4px ${PICKER_PADDING}px;
    }
    .colors-grid {
      display: grid;
      padding: ${LINE_VERTICAL_PADDING}px ${PICKER_PADDING}px;
      grid-template-columns: repeat(${ITEMS_PER_LINE}, 1fr);
      grid-gap: ${ITEM_GAP}px;
    }
    .o-color-picker-toggler-button {
      display: flex;
      .o-color-picker-toggler-sign {
        display: flex;
        margin: auto auto;
        width: 55%;
        height: 55%;
        .o-icon {
          width: 100%;
          height: 100%;
        }
      }
    }
    .o-color-picker-line-item {
      width: ${ITEM_EDGE_LENGTH}px;
      height: ${ITEM_EDGE_LENGTH}px;
      margin: 0px;
      border-radius: 50px;
      border: ${ITEM_BORDER_WIDTH}px solid #666666;
      padding: 0px;
      font-size: 16px;
      background: white;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
        outline: 1px solid gray;
        cursor: pointer;
      }
    }
    .o-buttons {
      padding: ${PICKER_PADDING}px;
      display: flex;
      .o-cancel {
        border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
        width: 100%;
        padding: 5px;
        font-size: 14px;
        background: white;
        border-radius: 4px;
        box-sizing: border-box;
        &:hover:enabled {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
    }
    .o-add-button {
      border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
      padding: 4px;
      background: white;
      border-radius: 4px;
      &:hover:enabled {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .o-separator {
      border-bottom: ${MENU_SEPARATOR_BORDER_WIDTH}px solid ${SEPARATOR_COLOR};
      margin-top: ${MENU_SEPARATOR_PADDING}px;
      margin-bottom: ${MENU_SEPARATOR_PADDING}px;
    }

    .o-custom-selector {
      padding: ${PICKER_PADDING + 2}px ${PICKER_PADDING}px;
      position: relative;
      .o-gradient {
        margin-bottom: ${MAGNIFIER_EDGE / 2}px;
        border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
        box-sizing: border-box;
        width: ${INNER_GRADIENT_WIDTH + 2 * ITEM_BORDER_WIDTH}px;
        height: ${INNER_GRADIENT_HEIGHT + 2 * ITEM_BORDER_WIDTH}px;
        position: relative;
      }

      .magnifier {
        height: ${MAGNIFIER_EDGE}px;
        width: ${MAGNIFIER_EDGE}px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0px 0px 3px #c0c0c0;
        position: absolute;
        z-index: 2;
      }
      .saturation {
        background: linear-gradient(to right, #fff 0%, transparent 100%);
      }
      .lightness {
        background: linear-gradient(to top, #000 0%, transparent 100%);
      }
      .o-hue-picker {
        border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
        box-sizing: border-box;
        width: 100%;
        height: 12px;
        border-radius: 4px;
        background: linear-gradient(
          to right,
          hsl(0 100% 50%) 0%,
          hsl(0.2turn 100% 50%) 20%,
          hsl(0.3turn 100% 50%) 30%,
          hsl(0.4turn 100% 50%) 40%,
          hsl(0.5turn 100% 50%) 50%,
          hsl(0.6turn 100% 50%) 60%,
          hsl(0.7turn 100% 50%) 70%,
          hsl(0.8turn 100% 50%) 80%,
          hsl(0.9turn 100% 50%) 90%,
          hsl(1turn 100% 50%) 100%
        );
        position: relative;
        cursor: crosshair;
      }
      .o-hue-slider {
        margin-top: -3px;
      }
      .o-custom-input-preview {
        padding: 2px 0px;
        display: flex;
        input {
          box-sizing: border-box;
          width: 50%;
          border-radius: 4px;
          padding: 4px 23px 4px 10px;
          height: 24px;
          border: 1px solid #c0c0c0;
          margin-right: 2px;
        }
        .o-wrong-color {
          /** FIXME bootstrap class instead? */
          outline-color: red;
          border-color: red;
          &:focus {
            outline-style: solid;
            outline-width: 1px;
          }
        }
      }
      .o-custom-input-buttons {
        padding: 2px 0px;
        display: flex;
        justify-content: end;
      }
      .o-color-preview {
        border: 1px solid #c0c0c0;
        border-radius: 4px;
        width: 50%;
      }
    }
  }
`;

export interface ColorPickerProps {
  anchorRect: Rect;
  maxHeight?: Pixel;
  onColorPicked: (color: Color) => void;
  currentColor: Color;
}

interface State {
  showGradient: boolean;
  currentHslaColor: HSLA;
  customHexColor: Color;
}

export class ColorPicker extends Component<ColorPickerProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorPicker";
  static props = {
    onColorPicked: Function,
    currentColor: { type: String, optional: true },
    maxHeight: { type: Number, optional: true },
    anchorRect: Object,
  };
  static defaultProps = { currentColor: "" };
  static components = { Popover };

  COLORS = COLOR_PICKER_DEFAULTS;

  private state: State = useState({
    showGradient: false,
    currentHslaColor: isColorValid(this.props.currentColor)
      ? { ...hexToHSLA(this.props.currentColor), a: 1 }
      : { h: 0, s: 100, l: 100, a: 1 },
    customHexColor: isColorValid(this.props.currentColor) ? toHex(this.props.currentColor) : "",
  });

  get colorPickerStyle(): string {
    if (this.props.maxHeight !== undefined && this.props.maxHeight <= 0) {
      return cssPropertiesToCss({ display: "none" });
    }
    return "";
  }

  get popoverProps(): PopoverProps {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: this.props.maxHeight,
      positioning: "BottomLeft",
      verticalOffset: 0,
    };
  }

  get gradientHueStyle(): string {
    const hue = this.state.currentHslaColor?.h || 0;
    return cssPropertiesToCss({
      background: `hsl(${hue} 100% 50%)`,
    });
  }

  get sliderStyle(): string {
    const hue = this.state.currentHslaColor?.h || 0;
    const delta = Math.round((hue / 360) * INNER_GRADIENT_WIDTH);
    const left = clip(delta, 1, INNER_GRADIENT_WIDTH) - ICON_EDGE_LENGTH / 2;
    return cssPropertiesToCss({
      "margin-left": `${left}px`,
    });
  }

  get pointerStyle(): string {
    const { s, l } = this.state.currentHslaColor || { s: 0, l: 0 };
    const left = Math.round(INNER_GRADIENT_WIDTH * clip(s / 100, 0, 1));
    const top = Math.round(INNER_GRADIENT_HEIGHT * clip(1 - (2 * l) / (200 - s), 0, 1));

    return cssPropertiesToCss({
      left: `${-MAGNIFIER_EDGE / 2 + left}px`,
      top: `${-MAGNIFIER_EDGE / 2 + top}px`,
      background: hslaToHex(this.state.currentHslaColor),
    });
  }

  get colorPreviewStyle(): string {
    return cssPropertiesToCss({
      "background-color": hslaToHex(this.state.currentHslaColor),
    });
  }

  get checkmarkColor(): Color {
    return chartFontColor(this.props.currentColor);
  }

  get isHexColorInputValid(): boolean {
    return !this.state.customHexColor || isColorValid(this.state.customHexColor);
  }

  private setCustomGradient({ x, y }: PixelPosition) {
    const offsetX = clip(x, 0, INNER_GRADIENT_WIDTH);
    const offsetY = clip(y, 0, INNER_GRADIENT_HEIGHT);
    const deltaX = offsetX / INNER_GRADIENT_WIDTH;
    const deltaY = offsetY / INNER_GRADIENT_HEIGHT;
    const s = 100 * deltaX;
    const l = 100 * (1 - deltaY) * (1 - 0.5 * deltaX);
    this.updateColor({ s, l });
  }

  private setCustomHue(x: Pixel) {
    // needs to be capped such that h is in [0°, 359°]
    const h = Math.round(clip((360 * x) / INNER_GRADIENT_WIDTH, 0, 359));
    this.updateColor({ h });
  }

  private updateColor(newHsl: Partial<Omit<HSLA, "a">>) {
    this.state.currentHslaColor = { ...this.state.currentHslaColor, ...newHsl };
    this.state.customHexColor = hslaToHex(this.state.currentHslaColor);
  }

  onColorClick(color: Color) {
    if (color) {
      this.props.onColorPicked(toHex(color));
    }
  }

  resetColor() {
    this.props.onColorPicked("");
  }

  toggleColorPicker() {
    this.state.showGradient = !this.state.showGradient;
  }

  dragGradientPointer(ev: MouseEvent) {
    const initialGradientCoordinates = { x: ev.offsetX, y: ev.offsetY };
    this.setCustomGradient(initialGradientCoordinates);

    const initialMousePosition = { x: ev.clientX, y: ev.clientY };

    const onMouseMove = (ev: MouseEvent) => {
      const currentMousePosition = { x: ev.clientX, y: ev.clientY };
      const deltaX = currentMousePosition.x - initialMousePosition.x;
      const deltaY = currentMousePosition.y - initialMousePosition.y;

      const currentGradientCoordinates = {
        x: initialGradientCoordinates.x + deltaX,
        y: initialGradientCoordinates.y + deltaY,
      };
      this.setCustomGradient(currentGradientCoordinates);
    };

    startDnd(onMouseMove, () => {});
  }

  dragHuePointer(ev: MouseEvent) {
    const initialX = ev.offsetX;
    const initialMouseX = ev.clientX;
    this.setCustomHue(initialX);
    const onMouseMove = (ev: MouseEvent) => {
      const currentMouseX = ev.clientX;
      const deltaX = currentMouseX - initialMouseX;
      const x = initialX + deltaX;
      this.setCustomHue(x);
    };
    startDnd(onMouseMove, () => {});
  }

  setHexColor(ev: InputEvent) {
    // only support HEX code input
    const val = (ev.target as HTMLInputElement).value.slice(0, 7);
    this.state.customHexColor = val;
    if (!isColorValid(val)) {
    } else {
      this.state.currentHslaColor = { ...hexToHSLA(val), a: 1 };
    }
  }

  addCustomColor(ev: Event) {
    if (!isHSLAValid(this.state.currentHslaColor) || !isColorValid(this.state.customHexColor)) {
      return;
    }
    this.props.onColorPicked(toHex(this.state.customHexColor));
  }

  isSameColor(color1: Color, color2: Color): boolean {
    return isSameColor(color1, color2);
  }
}
