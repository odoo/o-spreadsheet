import { Component, useState } from "@odoo/owl";
import {
  COLOR_PICKER_DEFAULTS,
  ComponentsImportance,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
} from "../../constants";
import { hslaToRGBA, isColorValid, isSameColor, rgbaToHex, toHex } from "../../helpers";
import { chartFontColor } from "../../helpers/charts";
import { Color, Pixel } from "../../types";
import { SpreadsheetChildEnv } from "../../types/env";
import { css, cssPropertiesToCss } from "../helpers/css";

const PICKER_PADDING = 6;

const LINE_VERTICAL_PADDING = 1;
const LINE_HORIZONTAL_PADDING = 6;

const ITEM_HORIZONTAL_MARGIN = 1;
const ITEM_EDGE_LENGTH = 18;
const ITEM_BORDER_WIDTH = 1;

const ITEMS_PER_LINE = 10;
const PICKER_WIDTH =
  ITEMS_PER_LINE * (ITEM_EDGE_LENGTH + ITEM_HORIZONTAL_MARGIN * 2 + 2 * ITEM_BORDER_WIDTH) +
  2 * LINE_HORIZONTAL_PADDING;

const GRADIENT_WIDTH = PICKER_WIDTH - 2 * LINE_HORIZONTAL_PADDING - 2 * ITEM_BORDER_WIDTH;
const GRADIENT_HEIGHT = PICKER_WIDTH - 50;

css/* scss */ `
  .o-color-picker {
    position: absolute;
    top: calc(100% + 5px);
    z-index: ${ComponentsImportance.ColorPicker};
    padding: ${PICKER_PADDING}px 0px;
    box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
    background-color: white;
    line-height: 1.2;
    overflow-y: auto;
    overflow-x: hidden;
    width: ${GRADIENT_WIDTH + 2 * PICKER_PADDING}px;

    .o-color-picker-section-name {
      margin: 0px ${ITEM_HORIZONTAL_MARGIN}px;
      padding: 4px ${LINE_HORIZONTAL_PADDING}px;
    }
    .colors-grid {
      display: grid;
      padding: ${LINE_VERTICAL_PADDING}px ${LINE_HORIZONTAL_PADDING}px;
      grid-template-columns: repeat(${ITEMS_PER_LINE}, 1fr);
      grid-gap: ${ITEM_HORIZONTAL_MARGIN * 2}px;
    }
    .o-color-picker-toggler {
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
      padding: 6px;
      display: flex;
      .o-cancel {
        margin: 0px ${ITEM_HORIZONTAL_MARGIN}px;
        border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
        width: 100%;
        padding: 5px;
        font-size: 14px;
        background: white;
        border-radius: 4px;
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
      border-bottom: ${MENU_SEPARATOR_BORDER_WIDTH}px solid #e0e2e4;
      margin-top: ${MENU_SEPARATOR_PADDING}px;
      margin-bottom: ${MENU_SEPARATOR_PADDING}px;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      border-radius: 4px;
      padding: 4px 23px 4px 10px;
      height: 24px;
      border: 1px solid #c0c0c0;
      margin: 0 2px 0 0;
    }
    input.o-wrong-color {
      border-color: red;
    }
    .o-custom-selector {
      padding: ${LINE_HORIZONTAL_PADDING}px;
      position: relative;
      .o-gradient {
        background: linear-gradient(to bottom, hsl(0 100% 0%), transparent, hsl(0 0% 100%)),
          linear-gradient(
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
        border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
        width: ${GRADIENT_WIDTH}px;
        height: ${GRADIENT_HEIGHT}px;
        &:hover {
          cursor: crosshair;
        }
      }
      .o-custom-input-preview {
        padding: 2px ${LINE_VERTICAL_PADDING}px;
        display: flex;
      }
      .o-custom-input-buttons {
        padding: 2px ${LINE_VERTICAL_PADDING}px;
        text-align: right;
      }
      .o-color-preview {
        border: 1px solid #c0c0c0;
        border-radius: 4px;
        width: 100%;
      }
    }
    &.right {
      left: 0;
    }
    &.left {
      right: 0;
    }
    &.center {
      left: calc(50% - ${PICKER_WIDTH / 2}px);
    }
  }
  .o-magnifier-glass {
    position: absolute;
    border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
    border-radius: 50%;
    width: 30px;
    height: 30px;
  }
`;

function computeCustomColor(ev: MouseEvent) {
  return rgbaToHex(
    hslaToRGBA({
      h: (360 * ev.offsetX) / GRADIENT_WIDTH,
      s: 100,
      l: (100 * ev.offsetY) / GRADIENT_HEIGHT,
      a: 1,
    })
  );
}

export interface ColorPickerProps {
  maxHeight?: Pixel;
  dropdownDirection?: "left" | "right" | "center";
  onColorPicked: (color: Color) => void;
  currentColor: Color;
  disableNoColor?: boolean;
}

interface State {
  showGradient: boolean;
  currentColor: Color;
  isCurrentColorInvalid: boolean;
  style: {
    display: string;
    background: Color;
    left: string;
    top: string;
  };
}

export class ColorPicker extends Component<ColorPickerProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorPicker";
  COLORS = COLOR_PICKER_DEFAULTS;

  private state: State = useState({
    showGradient: false,
    currentColor: isColorValid(this.props.currentColor) ? this.props.currentColor : "",
    isCurrentColorInvalid: false,
    style: {
      display: "none",
      background: "#ffffff",
      left: "0",
      top: "0",
    },
  });

  get colorPickerStyle(): string {
    if (this.props.maxHeight === undefined) return "";
    if (this.props.maxHeight <= 0) {
      return cssPropertiesToCss({ display: "none" });
    }
    return cssPropertiesToCss({
      "max-height": `${this.props.maxHeight}px`,
    });
  }

  onColorClick(color: Color) {
    if (color) {
      this.props.onColorPicked(toHex(color));
    }
  }

  getCheckMarkColor(): Color {
    return chartFontColor(this.props.currentColor);
  }

  resetColor() {
    this.props.onColorPicked("");
  }

  setCustomColor(ev: Event) {
    if (!isColorValid(this.state.currentColor)) {
      ev.stopPropagation();
      this.state.isCurrentColorInvalid = true;
      return;
    }
    const color = toHex(this.state.currentColor);
    this.state.isCurrentColorInvalid = false;
    this.props.onColorPicked(color);
    this.state.currentColor = color;
  }

  toggleColorPicker() {
    this.state.showGradient = !this.state.showGradient;
  }

  computeCustomColor(ev: MouseEvent) {
    this.state.isCurrentColorInvalid = false;
    this.state.currentColor = computeCustomColor(ev);
  }

  hideMagnifier(_ev: MouseEvent) {
    this.state.style.display = "none";
  }

  showMagnifier(_ev: MouseEvent) {
    this.state.style.display = "block";
  }

  moveMagnifier(ev: MouseEvent) {
    this.state.style.background = computeCustomColor(ev);
    const shiftFromCursor = 10;
    this.state.style.left = `${ev.offsetX + shiftFromCursor}px`;
    this.state.style.top = `${ev.offsetY + shiftFromCursor}px`;
  }

  get magnifyingGlassStyle() {
    const { display, background, left, top } = this.state.style;
    return `display:${display};${
      display === "block" ? `background-color:${background};left:${left};top:${top};` : ""
    }`;
  }

  isSameColor(color1: Color, color2: Color): boolean {
    return isSameColor(color1, color2);
  }
}
