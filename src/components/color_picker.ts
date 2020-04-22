import * as owl from "@odoo/owl";
import { SpreadsheetEnv } from "../types/env";
const { Component } = owl;
const { css, xml } = owl.tags;

const COLORS = [
  [
    "#ffffff",
    "#000100",
    "#e7e5e6",
    "#445569",
    "#5b9cd6",
    "#ed7d31",
    "#a5a5a5",
    "#ffc001",
    "#4371c6",
    "#71ae47",
  ],
  [
    "#f2f2f2",
    "#7f7f7f",
    "#d0cecf",
    "#d5dce4",
    "#deeaf6",
    "#fce5d5",
    "#ededed",
    "#fff2cd",
    "#d9e2f3",
    "#e3efd9",
  ],
  [
    "#d8d8d8",
    "#595959",
    "#afabac",
    "#adb8ca",
    "#bdd7ee",
    "#f7ccac",
    "#dbdbdb",
    "#ffe59a",
    "#b3c6e7",
    "#c5e0b3",
  ],
  [
    "#bfbfbf",
    "#3f3f3f",
    "#756f6f",
    "#8596b0",
    "#9cc2e6",
    "#f4b184",
    "#c9c9c9",
    "#fed964",
    "#8eaada",
    "#a7d08c",
  ],
  [
    "#a5a5a5",
    "#262626",
    "#3a3839",
    "#333f4f",
    "#2e75b5",
    "#c45a10",
    "#7b7b7b",
    "#bf8e01",
    "#2f5596",
    "#538136",
  ],
  [
    "#7f7f7f",
    "#0c0c0c",
    "#171516",
    "#222a35",
    "#1f4e7a",
    "#843c0a",
    "#525252",
    "#7e6000",
    "#203864",
    "#365624",
  ],
  [
    "#c00000",
    "#fe0000",
    "#fdc101",
    "#ffff01",
    "#93d051",
    "#00b04e",
    "#01b0f1",
    "#0170c1",
    "#012060",
    "#7030a0",
  ],
];

export class ColorPicker extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
  <div class="o-color-picker" t-on-click="onColorClick">
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
      left: 0;
      z-index: 10;
      box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
      background-color: #f6f6f6;

      .o-color-picker-line {
        display: flex;
        padding: 3px 6px;
        .o-color-picker-line-item {
          width: 16px;
          height: 16px;
          margin: 1px 3px;
          &:hover {
            background-color: rgba(0, 0, 0, 0.08);
            outline: 1px solid gray;
          }
        }
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
