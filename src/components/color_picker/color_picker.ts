import { COLOR_PICKER_DEFAULTS, ICON_EDGE_LENGTH } from "@odoo/o-spreadsheet-engine/constants";
import { Component, useState } from "@odoo/owl";
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
import { SpreadsheetChildEnv } from "../../types/spreadsheetChildEnv";
import { cssPropertiesToCss } from "../helpers/css";
import { startDnd } from "../helpers/drag_and_drop";
import { Popover, PopoverProps } from "../popover/popover";

const ITEM_BORDER_WIDTH = 1;
const ITEM_EDGE_LENGTH = 18;
const ITEMS_PER_LINE = 10;
const MAGNIFIER_EDGE = 16;
const ITEM_GAP = 2;

const CONTENT_WIDTH =
  ITEMS_PER_LINE * (ITEM_EDGE_LENGTH + 2 * ITEM_BORDER_WIDTH) + (ITEMS_PER_LINE - 1) * ITEM_GAP;

const INNER_GRADIENT_WIDTH = CONTENT_WIDTH - 2 * ITEM_BORDER_WIDTH;
const INNER_GRADIENT_HEIGHT = CONTENT_WIDTH - 30 - 2 * ITEM_BORDER_WIDTH;

export interface ColorPickerProps {
  anchorRect: Rect;
  maxHeight?: Pixel;
  onColorPicked: (color: Color) => void;
  currentColor: Color;
  disableNoColor?: boolean;
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
    disableNoColor: { type: Boolean, optional: true },
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
      positioning: "bottom-left",
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
    const val = (ev.target as HTMLInputElement).value.replace("##", "#").slice(0, 7);
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
