import * as owl from "@odoo/owl";
import * as icons from "../../icons";
import { colorScale, conditionalFormattingTerms } from ".././translations_terms";

const { xml } = owl.tags;

const PREVIEW_TEMPLATE = xml/* xml */ `
  <div class="o-cf-preview-gradient" t-attf-style="{{getPreviewGradient()}}">
    <t t-esc="env._t('${conditionalFormattingTerms.PREVIEW_TEXT}')"/>
  </div>
`;

const THRESHOLD_TEMPLATE = xml/* xml */ `
  <div t-attf-class="o-threshold o-threshold-{{thresholdType}}">
      <t t-if="thresholdType === 'midpoint'">
        <t t-set="type" t-value="threshold and threshold.type"/>
        <select class="o-input" name="valueType" t-on-change="onMidpointChange" t-on-click="closeMenus">
          <option value="none" t-esc="env._t('${colorScale.None}')" t-att-selected="threshold === undefined"/>
          <option value="number" t-esc="env._t('${conditionalFormattingTerms.FixedNumber}')" t-att-selected="type === 'number'"/>
          <option value="percentage" t-esc="env._t('${conditionalFormattingTerms.Percentage}')" t-att-selected="type === 'percentage'"/>
          <option value="percentile" t-esc="env._t('${conditionalFormattingTerms.Percentile}')" t-att-selected="type === 'percentile'"/>
          <option value="formula" t-esc="env._t('${conditionalFormattingTerms.Formula}')" t-att-selected="type === 'formula'"/>
        </select>
      </t>
      <t t-else="">
        <select class="o-input" name="valueType" t-model="threshold.type" t-on-click="closeMenus">
          <option value="value" t-esc="env._t('${colorScale.CellValues}')"/>
          <option value="number" t-esc="env._t('${conditionalFormattingTerms.FixedNumber}')"/>
          <option value="percentage" t-esc="env._t('${conditionalFormattingTerms.Percentage}')"/>
          <option value="percentile" t-esc="env._t('${conditionalFormattingTerms.Percentile}')"/>
          <option value="formula" t-esc="env._t('${conditionalFormattingTerms.Formula}')"/>
        </select>
      </t>
      <input type="text" class="o-input o-threshold-value o-required"
        t-model="rule[thresholdType].value"
        t-att-class="{ 'o-invalid': isValueInvalid(thresholdType) }"
        t-if="threshold !== undefined and threshold.type !== 'value'"
      />
      <input type="text" class="o-input o-threshold-value"
        t-else="" disabled="1"
      />
      <div class="o-tools">
        <div class="o-tool  o-dropdown o-with-color" t-att-disabled="threshold === undefined" >
          <span title="Fill Color"  t-attf-style="border-color:#{{getThresholdColor(threshold)}}"
                t-on-click.stop="toggleMenu('colorScale-'+thresholdType+'Color')">${icons.FILL_COLOR_ICON}</span>
          <ColorPicker t-if="state.openedMenu === 'colorScale-'+thresholdType+'Color'" dropdownDirection="'left'" onColorPicked="(color) => this.setColorScaleColor(thresholdType, color)"/>
        </div>
      </div>
  </div>`;

export const TEMPLATE_COLOR_SCALE_EDITOR = xml/* xml */ `
  <div class="o-cf-color-scale-editor">
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.Preview}')"/>
      </div>
      <t t-call="${PREVIEW_TEMPLATE}"/>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.Minpoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="rule.minimum" ></t>
          <t t-set="thresholdType" t-value="'minimum'" ></t>
      </t>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.MidPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="rule.midpoint" ></t>
          <t t-set="thresholdType" t-value="'midpoint'" ></t>
      </t>
      <div class="o-cf-title-text">
        <t t-esc="env._t('${colorScale.MaxPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="rule.maximum" ></t>
          <t t-set="thresholdType" t-value="'maximum'" ></t>
      </t>
  </div>`;
