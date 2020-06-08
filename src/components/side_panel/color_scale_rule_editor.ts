import * as owl from "@odoo/owl";
import * as icons from "../icons";

import { ColorPicker } from "../color_picker";
import { colorNumberString } from "../../helpers/index";
import { ColorScaleRule, ConditionalFormat, SpreadsheetEnv } from "../../types";

const { Component, useState, hooks } = owl;
const { useExternalListener } = hooks;
const { xml, css } = owl.tags;

export const PREVIEW_TEMPLATE = xml/* xml */ `
    <div class="o-cf-preview-gradient" t-attf-style="background-image: linear-gradient(to right, #{{colorNumberString(state.minimum.color)}}, #{{colorNumberString(state.maximum.color)}})">
      <div t-esc="previewText">Preview text</div>
    </div>
`;

const THRESHOLD_TEMPLATE = xml/* xml */ `
  <div t-attf-class="o-threshold o-threshold-{{thresholdType}}">
      <div class="o-tools">
        <div class="o-tool  o-dropdown o-with-color">
        <span title="Fill Color"  t-attf-style="border-color:#{{colorNumberString(threshold.color)}}"
              t-on-click.stop="toggleMenu(thresholdType+'ColorTool')">${icons.FILL_COLOR_ICON}</span>
              <ColorPicker t-if="state[thresholdType+'ColorTool']" t-on-color-picked="setColor(thresholdType)"/>
          </div>
      </div>
      <select name="valueType" t-model="threshold.type" t-on-click="closeMenus">
          <option value="value">Cell values</option>
<!--          <option value="number">Fixed number</option>--> <!-- not yet implemented -->
<!--          <option value="percentage">Percentage</option>-->
<!--          <option value="percentile">Percentile</option>-->
<!--          <option value="formula">Formula</option>-->
      </select>

      <input type="text" t-model="threshold.value" class="o-threshold-value"
            t-att-disabled="threshold.type !== 'number'"/>
  </div>`;

const TEMPLATE = xml/* xml */ `
  <div>
      <div class="o-cf-title-format">Format rules</div>
      <div class="o-cf-title-text">Preview</div>
      <t t-call="${PREVIEW_TEMPLATE}"/>
      <div class="o-cf-title-text">Minpoint</div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="state.minimum" ></t>
          <t t-set="thresholdType" t-value="'minimum'" ></t>
      </t>
      <div class="o-cf-title-text">MaxPoint</div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="state.maximum" ></t>
          <t t-set="thresholdType" t-value="'maximum'" ></t>
      </t>
      <div class="o-cf-buttons">
        <button t-on-click="onCancel" class="o-cf-button o-cf-cancel">Cancel</button>
        <button t-on-click="onSave" class="o-cf-button o-cf-save">Save</button>
      </div>
  </div>`;

const CSS = css/* scss */ `
  .o-cf-title-format {
    margin: 10px 0px 18px 0px;
  }
  .o-cf-title-text {
    font-size: 12px;
    line-height: 14px;
    margin-bottom: 6px;
    margin-top: 18px;
  }
  .o-threshold {
    display: flex;
    flex-direction: horizontal;

    .o-threshold-value {
      width: 5em;
      margin-left: 15px;
      margin-right: 15px;
    }
  }
  .o-cf-preview-gradient {
    border: 1px solid darkgrey;
    padding: 10px;
  }
  .o-cf-buttons {
    padding: 5px;
    text-align: right;
    border-bottom: 1px solid #ccc;
    .o-cf-button {
      border: 1px solid lightgrey;
      padding: 0px 20px 0px 20px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 14px;
      height: 36px;
      line-height: 16px;
      background: white;
      cursor: pointer;
      margin-right: 16px;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
  }
`;

interface Props {
  conditionalFormat: ConditionalFormat;
}

export class ColorScaleRuleEditor extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ColorPicker };

  cf = this.props.conditionalFormat;
  colorNumberString = colorNumberString;
  rule = this.cf ? (this.cf.rule as ColorScaleRule) : null;
  state = useState({
    minimum: this.rule
      ? Object.assign({}, this.rule.minimum)
      : { color: 0xffffff, type: "value", value: null },
    maximum: this.rule
      ? Object.assign({}, this.rule.maximum)
      : { color: 0x000000, type: "value", value: null },
    midpoint:
      this.rule && Object.assign({}, this.rule.midpoint)
        ? this.rule.midpoint
        : { color: 0xffffff, type: "value", value: null },
    maximumColorTool: false,
    minimumColorTool: false,
  });
  constructor() {
    super(...arguments);
    useExternalListener(window as any, "click", this.closeMenus);
  }

  toggleMenu(tool) {
    const current = this.state[tool];
    this.closeMenus();
    this.state[tool] = !current;
  }

  toggleTool(tool: string) {
    this.closeMenus();
  }
  setColor(target: string, ev: CustomEvent) {
    const color: string = ev.detail.color;
    this.state[target].color = Number.parseInt(color.substr(1), 16);
    this.closeMenus();
  }
  closeMenus() {
    this.state.minimumColorTool = false;
    this.state.maximumColorTool = false;
  }

  onSave() {
    this.trigger("modify-rule", {
      rule: {
        type: "ColorScaleRule",
        minimum: this.state.minimum,
        maximum: this.state.maximum,
        midpoint: this.state.midpoint,
      },
    });
  }
  onCancel() {
    this.trigger("cancel-edit");
  }
}
