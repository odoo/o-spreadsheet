import * as owl from "@odoo/owl";
import { colorNumberString } from "../../../helpers/index";
import {
  CancelledReason,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  CommandResult,
  ConditionalFormatRule,
  SpreadsheetEnv,
} from "../../../types";
import { ColorPicker } from "../../color_picker";
import * as icons from "../../icons";
import { colorScale, conditionalFormattingTerms } from ".././translations_terms";

const { Component, useState, hooks } = owl;
const { useExternalListener } = hooks;
const { xml, css } = owl.tags;

const PREVIEW_TEMPLATE = xml/* xml */ `
  <div class="o-cf-preview-gradient" t-attf-style="{{getPreviewGradient()}}">
    <t t-esc="env._t('${conditionalFormattingTerms.PREVIEW_TEXT}')"/>
  </div>
`;

const THRESHOLD_TEMPLATE = xml/* xml */ `
  <div t-attf-class="o-threshold o-threshold-{{thresholdType}}">
      <select class="o-input" name="valueType" t-model="threshold.type" t-on-click="closeMenus">
        <option value="value" t-if="thresholdType!=='midpoint'">
          <t t-esc="env._t('${colorScale.CellValues}')"/>
        </option>
        <option value="none" t-if="thresholdType==='midpoint'">
          <t t-esc="env._t('${colorScale.None}')"/>
        </option>
        <option value="number">
          <t t-esc="env._t('${conditionalFormattingTerms.FixedNumber}')"/>
        </option>
        <option value="percentage">
          <t t-esc="env._t('${conditionalFormattingTerms.Percentage}')"/>
        </option>
        <option value="percentile">
          <t t-esc="env._t('${conditionalFormattingTerms.Percentile}')"/>
        </option>
        <option value="formula">
          <t t-esc="env._t('${conditionalFormattingTerms.Formula}')"/>
        </option>
      </select>
      <input type="text" class="o-input o-threshold-value o-required"
        t-model="stateColorScale[thresholdType].value"
        t-att-class="{ 'o-invalid': isValueInvalid(thresholdType) }"
        t-if="['number', 'percentage', 'percentile', 'formula'].includes(threshold.type)"
      />
      <input type="text" class="o-input o-threshold-value"
        t-else="" disabled="1"
      />
      <div class="o-tools">
        <div class="o-tool  o-dropdown o-with-color">
          <span title="Fill Color"  t-attf-style="border-color:#{{colorNumberString(threshold.color)}}"
                t-on-click.stop="toggleMenu(thresholdType+'ColorTool')">${icons.FILL_COLOR_ICON}</span>
          <ColorPicker t-if="stateColorScale[thresholdType+'ColorTool']" dropdownDirection="'left'" t-on-color-picked="setColor(thresholdType)"/>
        </div>
      </div>
  </div>`;

const TEMPLATE = xml/* xml */ `
  <div>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${colorScale.Preview}')"/>
      </div>
      <t t-call="${PREVIEW_TEMPLATE}"/>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${colorScale.Minpoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="stateColorScale.minimum" ></t>
          <t t-set="thresholdType" t-value="'minimum'" ></t>
      </t>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${colorScale.MidPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="stateColorScale.midpoint" ></t>
          <t t-set="thresholdType" t-value="'midpoint'" ></t>
      </t>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${colorScale.MaxPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="stateColorScale.maximum" ></t>
          <t t-set="thresholdType" t-value="'maximum'" ></t>
      </t>
  </div>`;

const CSS = css/* scss */ `
  .o-threshold {
    display: flex;
    flex-direction: horizontal;
    select {
      width: 100%;
    }
    .o-threshold-value {
      margin-left: 2%;
      width: 20%;
      min-width: 0px; // input overflows in Firefox otherwise
    }
    .o-threshold-value:disabled {
      background-color: #edebed;
    }
  }
  .o-cf-preview-gradient {
    border: 1px solid darkgrey;
    padding: 10px;
    border-radius: 4px;
  }
`;

interface Props {
  rule: ColorScaleRule;
  errors: CancelledReason[];
}

type ComponentColorScaleMidPointThreshold = {
  color: number;
  type: "none" | "number" | "percentage" | "percentile" | "formula";
  value?: string;
};
interface State {
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
  static defaultProps = {
    errors: [],
  };

  colorNumberString = colorNumberString;

  stateColorScale: State = useState({
    minimum: this.props.rule.minimum,
    maximum: this.props.rule.maximum,
    midpoint: this.props.rule.midpoint
      ? this.props.rule.midpoint
      : { color: 0xb6d7a8, type: "none" },
    maximumColorTool: false,
    minimumColorTool: false,
    midpointColorTool: false,
  });

  setup() {
    useExternalListener(window as any, "click", this.closeMenus);
  }

  getRule(): ColorScaleRule {
    const minimum = { ...this.stateColorScale.minimum };
    const midpoint = { ...this.stateColorScale.midpoint };
    const maximum = { ...this.stateColorScale.maximum };
    return {
      type: "ColorScaleRule",
      minimum,
      maximum,
      midpoint: midpoint.type === "none" ? undefined : (midpoint as ColorScaleMidPointThreshold),
    };
  }

  toggleMenu(tool: string) {
    const current = this.stateColorScale[tool];
    this.closeMenus();
    this.stateColorScale[tool] = !current;
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

  isValueInvalid(threshold: "minimum" | "midpoint" | "maximum"): boolean {
    switch (threshold) {
      case "minimum":
        return (
          this.props.errors.includes(CommandResult.MinInvalidFormula) ||
          this.props.errors.includes(CommandResult.MinBiggerThanMid) ||
          this.props.errors.includes(CommandResult.MinBiggerThanMax) ||
          this.props.errors.includes(CommandResult.MinNaN)
        );
      case "midpoint":
        return (
          this.props.errors.includes(CommandResult.MidInvalidFormula) ||
          this.props.errors.includes(CommandResult.MidNaN) ||
          this.props.errors.includes(CommandResult.MidBiggerThanMax)
        );
      case "maximum":
        return (
          this.props.errors.includes(CommandResult.MaxInvalidFormula) ||
          this.props.errors.includes(CommandResult.MaxNaN)
        );

      default:
        return false;
    }
  }

  private closeMenus() {
    this.stateColorScale.minimumColorTool = false;
    this.stateColorScale.midpointColorTool = false;
    this.stateColorScale.maximumColorTool = false;
  }

  /**
   * Get a default rule for "ColorScaleRule"
   */
  static getDefaultRule(): ConditionalFormatRule {
    return {
      type: "ColorScaleRule",
      minimum: { type: "value", color: 0xffffff },
      midpoint: undefined,
      maximum: { type: "value", color: 0x6aa84f },
    };
  }
}
