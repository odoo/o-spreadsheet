import * as owl from "@odoo/owl";
import * as icons from "../icons";

import { ColorPicker } from "../color_picker";
import { colorNumberString } from "../../helpers/index";
import {
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  SpreadsheetEnv,
} from "../../types";
import { colorScale, conditionalFormatingTerms } from "./translations_terms";

const { Component, useState, hooks } = owl;
const { useExternalListener } = hooks;
const { xml, css } = owl.tags;

export const PREVIEW_TEMPLATE = xml/* xml */ `
  <div class="o-cf-preview-gradient" t-attf-style="{{getPreviewGradient()}}">
    <t t-esc="env._t('${conditionalFormatingTerms.PREVIEWTEXT}')"/>
  </div>
`;

const THRESHOLD_TEMPLATE = xml/* xml */ `
  <div t-attf-class="o-threshold o-threshold-{{thresholdType}}">
      <div class="o-tools">
        <div class="o-tool  o-dropdown o-with-color">
          <span title="Fill Color"  t-attf-style="border-color:#{{colorNumberString(threshold.color)}}"
                t-on-click.stop="toggleMenu(thresholdType+'ColorTool')">${icons.FILL_COLOR_ICON}</span>
          <ColorPicker t-if="stateColorScale[thresholdType+'ColorTool']" t-on-color-picked="setColor(thresholdType)"/>
        </div>
      </div>
      <select name="valueType" t-model="threshold.type" t-on-click="closeMenus">
        <option value="value" t-if="thresholdType!=='midpoint'">
          <t t-esc="env._t('${colorScale.CellValues}')"/>
        </option>
        <option value="none" t-if="thresholdType==='midpoint'">
          <t t-esc="env._t('${colorScale.None}')"/>
        </option>
        <option value="number">
          <t t-esc="env._t('${colorScale.FixedNumber}')"/>
        </option>
        <option value="percentage">
          <t t-esc="env._t('${colorScale.Percentage}')"/>
        </option>
        <option value="formula">
          <t t-esc="env._t('${colorScale.Formula}')"/>
        </option>
      </select>
      <input type="text" class="o-threshold-value"
        t-model="stateColorScale[thresholdType].value"
        t-if="['number', 'percentage', 'percentile', 'formula'].includes(threshold.type)"
      />
      <input type="text" class="o-threshold-value"
        t-else="" disabled="1"
      />
  </div>`;

const TEMPLATE = xml/* xml */ `
  <div>
      <div class="o-section-title">
        <t t-esc="env._t('${colorScale.FormatRules}')"/>
      </div>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.Preview}')"/>
      </div>
      <t t-call="${PREVIEW_TEMPLATE}"/>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.Minpoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="stateColorScale.minimum" ></t>
          <t t-set="thresholdType" t-value="'minimum'" ></t>
      </t>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.MidPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="stateColorScale.midpoint" ></t>
          <t t-set="thresholdType" t-value="'midpoint'" ></t>
      </t>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.MaxPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="stateColorScale.maximum" ></t>
          <t t-set="thresholdType" t-value="'maximum'" ></t>
      </t>
      <div class="o-cf-error" t-if="props.error">
        <t t-esc="props.error"/>
      </div>
      <div class="o-sidePanelButtons">
        <button t-on-click="onCancel" class="o-sidePanelButton o-cf-cancel">
          <t t-esc="env._t('${conditionalFormatingTerms.CANCEL}')"/>
        </button>
        <button class="o-sidePanelButton o-cf-save"
          t-on-click="onSave"
        >
          <t t-esc="env._t('${conditionalFormatingTerms.SAVE}')"/>
        </button>
      </div>
  </div>`;

const CSS = css/* scss */ `
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
      margin-left: 15px;
      width: 100%;
      min-width: 0px; // input overflows in Firefox otherwise
    }
  }
  .o-cf-preview-gradient {
    border: 1px solid darkgrey;
    padding: 10px;
  }
  .o-cf-error {
    color: red;
    margin-top: 10px;
  }
`;

interface Props {
  conditionalFormat: ConditionalFormat;
}

type ComponentColorScaleMidPointThreshold = {
  color: number;
  type: "none" | "number" | "percentage" | "formula";
  value?: string;
};
interface ComponentColorScaleRule {
  type: "ColorScaleRule";
  minimum: ColorScaleThreshold;
  maximum: ColorScaleThreshold;
  midpoint: ComponentColorScaleMidPointThreshold;
}

interface ColorScaleRuleState {
  minimum: ColorScaleThreshold;
  maximum: ColorScaleThreshold;
  midpoint: ComponentColorScaleMidPointThreshold;
  minimumColorTool: boolean;
  maximumColorTool: boolean;
  midpointColorTool: boolean;
}

export class ColorScaleRuleEditor extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ColorPicker };

  cf = this.props.conditionalFormat;
  colorNumberString = colorNumberString;
  rule = this.cf.rule as ColorScaleRule;
  stateColorScale = useState<ColorScaleRuleState>({
    minimum: this.rule.minimum,
    maximum: this.rule.maximum,
    midpoint: this.rule.midpoint ? this.rule.midpoint : { color: 0x444, type: "none" },
    maximumColorTool: false,
    minimumColorTool: false,
    midpointColorTool: false,
  });

  constructor() {
    super(...arguments);
    useExternalListener(window as any, "click", this.closeMenus);
  }

  toggleMenu(tool) {
    const current = this.stateColorScale[tool];
    this.closeMenus();
    this.stateColorScale[tool] = !current;
  }

  toggleTool(tool: string) {
    this.closeMenus();
  }
  setColor(target: string, ev: CustomEvent) {
    const color: string = ev.detail.color;
    this.stateColorScale[target].color = Number.parseInt(color.substr(1), 16);
    this.closeMenus();
  }

  getPreviewGradient() {
    const minColor = colorNumberString(this.stateColorScale.minimum.color);
    const midColor = colorNumberString(this.stateColorScale.midpoint.color);
    const maxColor = colorNumberString(this.stateColorScale.maximum.color);
    const baseString = "background-image: linear-gradient(to right, #";
    return this.stateColorScale.midpoint.type === "none"
      ? baseString + minColor + ", #" + maxColor + ")"
      : baseString + minColor + ", #" + midColor + ", #" + maxColor + ")";
  }

  closeMenus() {
    this.stateColorScale.minimumColorTool = false;
    this.stateColorScale.midpointColorTool = false;
    this.stateColorScale.maximumColorTool = false;
  }

  private cleanRule(rule: ComponentColorScaleRule): ColorScaleRule {
    switch (rule.type) {
      case "ColorScaleRule":
        if (rule.midpoint.type === "none") {
          return {
            ...rule,
            midpoint: undefined,
          };
        }
        return rule as ColorScaleRule;
        break;
      default:
        return rule as ColorScaleRule;
    }
  }
  onSave() {
    const minimum = { ...this.stateColorScale.minimum };
    const midpoint = { ...this.stateColorScale.midpoint };
    const maximum = { ...this.stateColorScale.maximum };
    const rule: ComponentColorScaleRule = {
      type: "ColorScaleRule",
      minimum,
      maximum,
      midpoint,
    };
    this.trigger("modify-rule", { rule: this.cleanRule(rule) });
  }
  onCancel() {
    this.trigger("cancel-edit");
  }
}
