import * as owl from "@odoo/owl";
import { SpreadsheetEnv } from "../types/env";
import { ICONS, ICON_SETS } from "./icons";
const { Component } = owl;
const { css, xml } = owl.tags;

export class IconPicker extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
  <div class="o-icon-picker" >
    <t t-foreach="iconSets" t-as="iconSet" t-key="iconset">
      <div class="o-cf-icon-line">
        <div class="o-icon-picker-item" t-on-click="onIconClick(iconSets[iconSet].good)">
          <t t-raw="icons[iconSets[iconSet].good].svg"/>
        </div>
        <div class="o-icon-picker-item" t-on-click="onIconClick(iconSets[iconSet].neutral)">
          <t t-raw="icons[iconSets[iconSet].neutral].svg"/>
        </div>
        <div class="o-icon-picker-item" t-on-click="onIconClick(iconSets[iconSet].bad)">
          <t t-raw="icons[iconSets[iconSet].bad].svg"/>
        </div>
      </div>
    </t>
  </div>`;

  static style = css/* scss */ `
    .o-icon-picker {
      position: absolute;
      z-index: 10;
      box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
      background-color: white;
      padding: 2px 1px;
    }
    .o-cf-icon-line {
      display: flex;
      padding: 3px 6px;
    }
    .o-icon-picker-item {
      margin: 0px 2px;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
        outline: 1px solid gray;
      }
    }
  `;

  icons = ICONS;
  iconSets = ICON_SETS;

  onIconClick(icon: string) {
    if (icon) {
      this.trigger("icon-picked", { icon });
    }
  }
}
