import * as owl from "@odoo/owl";
import * as icons from "../icons";

import { COLOR_PICKER, COLORS } from "../top_bar";
import { colorNumberString } from "../../helpers/index";
import { ColorScaleRule, ConditionalFormat } from "../../types";
import { Model } from "../../model";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

export const PREVIEW_TEMPLATE = xml/* xml */ `
    <div class="o-cf-preview"
         t-attf-style="font-weight:{{currentStyle.bold ?'bold':'normal'}};
                       text-decoration:{{currentStyle.strikethrough ? 'line-through':'none'}};
                       font-style:{{currentStyle.italic?'italic':'normal'}};
                       color:{{currentStyle.textColor}};
                       background-color:{{currentStyle.fillColor}};"
         t-esc="previewText || 'Preview text'" />
`;

const THRESHOLD_TEMPLATE = xml/* xml */ `
<div t-attf-class="o-threshold o-threshold-{{thresholdType}}">
    <div class="o-tools">
      <div class="o-tool  o-dropdown o-with-color">
      <span title="Fill Color"  t-attf-style="border-color:#{{colorNumberString(threshold.color)}}"
            t-on-click.stop="toggleMenu(thresholdType+'ColorTool')">${icons.FILL_COLOR_ICON}</span>
            <div class="o-dropdown-content" t-if="state[thresholdType+'ColorTool']"
                 t-on-click="setColor(thresholdType)">
                <t t-call="${COLOR_PICKER}"/>
            </div>
        </div>
    </div>
    <select name="valueType" t-model="threshold.type" t-on-click="closeMenus">
        <option value="value">Cell values</option>
        <option value="number">Fixed number</option>
        <option value="percentage">Percentage</option>
        <option value="percentile">Percentile</option>
        <option value="formula">Formula</option>
    </select>

    <input type="text" t-model="threshold.value" class="o-threshold-value"
           t-att-disabled="threshold.type !== 'number'"/>
</div>
`;
const TEMPLATE = xml/* xml */ `
<div>
    <h3>Condition</h3>
    <span>Color Scale</span>
    <h4>Minimum</h4>
    <t t-call="${THRESHOLD_TEMPLATE}">
        <t t-set="threshold" t-value="state.minimum" ></t> 
        <t t-set="thresholdType" t-value="'minimum'" ></t> 
    </t>
    <h4>Maximum</h4>
    <t t-call="${THRESHOLD_TEMPLATE}">
        <t t-set="threshold" t-value="state.maximum" ></t> 
        <t t-set="thresholdType" t-value="'maximum'" ></t> 
    </t>
    <div class="o-cf-buttons">
        <button t-on-click="onCancel" class="o-cf-cancel">Cancel</button>
        <button t-on-click="onSave" class="o-cf-save">Save</button>
    </div>
</div>
`;

const CSS = css/* scss */ `
  .o-threshold {
    display: flex;
    flex-direction: horizontal;

    .o-threshold-value {
      width: 5em;
      margin-left: 15px;
      margin-right: 15px;
    }
  }
`;

interface Props {
  conditionalFormat: ConditionalFormat;
  model: Model;
}

export class ColorScaleRuleEditor extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;

  COLORS = COLORS;

  model = this.props.model;
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
    minimumColorTool: false
  });

  toggleMenu(tool) {
    this.closeMenus();
    this.state[tool] = !this.state[tool];
  }

  toggleTool(tool: string) {
    this.closeMenus();
  }
  setColor(target, ev) {
    const colorString: string = ev.target.dataset.color;
    if (colorString) {
      this.state[target].color = Number.parseInt(colorString.substr(1), 16);
      this.closeMenus();
    }
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
        midpoint: this.state.midpoint
      }
    });
  }
  onCancel() {
    this.trigger("cancel-edit");
  }
}
