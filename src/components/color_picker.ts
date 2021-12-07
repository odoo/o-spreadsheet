import * as owl from "@odoo/owl";
import { SpreadsheetEnv } from "../types/env";
const { Component } = owl;
const { css, xml } = owl.tags;

const COLORS = [
  [
    "#000000",
    "#434343",
    "#666666",
    "#999999",
    "#b7b7b7",
    "#cccccc",
    "#d9d9d9",
    "#efefef",
    "#f3f3f3",
    "#ffffff",
  ],
  [
    "#980000",
    "#ff0000",
    "#ff9900",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#4a86e8",
    "#0000ff",
    "#9900ff",
    "#ff00ff",
  ],
  [
    "#e6b8af",
    "#f4cccc",
    "#fce5cd",
    "#fff2cc",
    "#d9ead3",
    "#d0e0e3",
    "#c9daf8",
    "#cfe2f3",
    "#d9d2e9",
    "#ead1dc",
  ],
  [
    "#dd7e6b",
    "#ea9999",
    "#f9cb9c",
    "#ffe599",
    "#b6d7a8",
    "#a2c4c9",
    "#a4c2f4",
    "#9fc5e8",
    "#b4a7d6",
    "#d5a6bd",
  ],
  [
    "#cc4125",
    "#e06666",
    "#f6b26b",
    "#ffd966",
    "#93c47d",
    "#76a5af",
    "#6d9eeb",
    "#6fa8dc",
    "#8e7cc3",
    "#c27ba0",
  ],
  [
    "#a61c00",
    "#cc0000",
    "#e69138",
    "#f1c232",
    "#6aa84f",
    "#45818e",
    "#3c78d8",
    "#3d85c6",
    "#674ea7",
    "#a64d79",
  ],
  [
    "#85200c",
    "#990000",
    "#b45f06",
    "#bf9000",
    "#38761d",
    "#134f5c",
    "#1155cc",
    "#0b5394",
    "#351c75",
    "#741b47",
  ],
  [
    "#5b0f00",
    "#660000",
    "#783f04",
    "#7f6000",
    "#274e13",
    "#0c343d",
    "#1c4587",
    "#073763",
    "#20124d",
    "#4c1130",
  ],
];

const PICKER_VERTICAL_PADDING = 6;

const LINE_VERTICAL_PADDING = 3;
const LINE_HORIZONTAL_PADDING = 6;

const ITEM_HORIZONTAL_MARGIN = 2;
const ITEM_EDGE_LENGTH = 18;
const ITEM_BORDER_WIDTH = 1;

const ITEMS_PER_LINE = Math.max(...COLORS.map((line) => line.length));
const PICKER_WIDTH =
  ITEMS_PER_LINE * (ITEM_EDGE_LENGTH + ITEM_HORIZONTAL_MARGIN * 2 + 2 * ITEM_BORDER_WIDTH) +
  2 * LINE_HORIZONTAL_PADDING;

interface Props {
  dropdownDirection?: "left" | "right" | "center";
}

export class ColorPicker extends Component<Props, SpreadsheetEnv> {
  static template = xml/* xml */ `
  <div class="o-color-picker"
    t-att-class="props.dropdownDirection || 'right'"
    t-on-click="onColorClick">
    <div class="o-color-picker-line" t-foreach="COLORS" t-as="colors" t-key="colors">
      <t t-foreach="colors" t-as="color" t-key="color">
        <div class="o-color-picker-line-item" t-att-data-color="color" t-attf-style="background-color:{{color}};"></div>
      </t>
    </div>
  </div>`;

  static style = css/* scss */ `
    .o-color-picker {
      position: absolute;
      top: calc(100% + 5px);
      z-index: 10;
      box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
      background-color: white;
      padding: ${PICKER_VERTICAL_PADDING}px 0px;

      .o-color-picker-line {
        display: flex;
        padding: ${LINE_VERTICAL_PADDING}px ${LINE_HORIZONTAL_PADDING}px;
        .o-color-picker-line-item {
          width: ${ITEM_EDGE_LENGTH}px;
          height: ${ITEM_EDGE_LENGTH}px;
          margin: 0px ${ITEM_HORIZONTAL_MARGIN}px;
          border-radius: 50px;
          border: ${ITEM_BORDER_WIDTH}px solid #c0c0c0;
          &:hover {
            cursor: pointer;
            background-color: rgba(0, 0, 0, 0.08);
            outline: 1px solid gray;
          }
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
  `;
  COLORS = COLORS;

  onColorClick(ev: MouseEvent) {
    const color = (ev.target as HTMLElement).dataset.color;
    if (color) {
      this.trigger("color-picked", { color });
    }
  }
}
