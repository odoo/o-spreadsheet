import { xml } from "@odoo/owl";
import * as icons from "../../icons";
import { CfTerms, ColorScale } from "../../translations_terms";

const PREVIEW_TEMPLATE = xml/* xml */ `
  <div class="o-cf-preview-gradient" t-attf-style="{{getPreviewGradient()}}">
    <t t-esc="env._t('${CfTerms.PreviewText}')"/>
  </div>
`;

const THRESHOLD_TEMPLATE = xml/* xml */ `
  <div t-attf-class="o-threshold o-threshold-{{thresholdType}}">
      <t t-if="thresholdType === 'midpoint'">
        <t t-set="type" t-value="threshold and threshold.type"/>
        <select class="o-input" name="valueType" t-on-change="onMidpointChange" t-on-click="closeMenus">
          <option value="none" t-esc="env._t('${ColorScale.None}')" t-att-selected="threshold === undefined"/>
          <option value="number" t-esc="env._t('${CfTerms.FixedNumber}')" t-att-selected="type === 'number'"/>
          <option value="percentage" t-esc="env._t('${CfTerms.Percentage}')" t-att-selected="type === 'percentage'"/>
          <option value="percentile" t-esc="env._t('${CfTerms.Percentile}')" t-att-selected="type === 'percentile'"/>
          <option value="formula" t-esc="env._t('${CfTerms.Formula}')" t-att-selected="type === 'formula'"/>
        </select>
      </t>
      <t t-else="">
        <select class="o-input" name="valueType" t-model="threshold.type" t-on-click="closeMenus">
          <option value="value" t-esc="env._t('${ColorScale.CellValues}')"/>
          <option value="number" t-esc="env._t('${CfTerms.FixedNumber}')"/>
          <option value="percentage" t-esc="env._t('${CfTerms.Percentage}')"/>
          <option value="percentile" t-esc="env._t('${CfTerms.Percentile}')"/>
          <option value="formula" t-esc="env._t('${CfTerms.Formula}')"/>
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
          <span title="Fill Color"  t-attf-style="border-color:{{getThresholdColor(threshold)}}"
                t-on-click.stop="(ev) => this.toggleMenu('colorScale-'+thresholdType+'Color', ev)">${icons.FILL_COLOR_ICON}</span>
          <ColorPicker t-if="state.openedMenu === 'colorScale-'+thresholdType+'Color'" dropdownDirection="'left'" onColorPicked="(color) => this.setColorScaleColor(thresholdType, color)"/>
        </div>
      </div>
  </div>`;

export const TEMPLATE_COLOR_SCALE_EDITOR = xml/* xml */ `
  <div class="o-cf-color-scale-editor">
      <div class="o-section-subtitle">
        <t t-esc="env._t('${ColorScale.Preview}')"/>
      </div>
      <t t-call="${PREVIEW_TEMPLATE}"/>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${ColorScale.Minpoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="rule.minimum" ></t>
          <t t-set="thresholdType" t-value="'minimum'" ></t>
      </t>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${ColorScale.MidPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="rule.midpoint" ></t>
          <t t-set="thresholdType" t-value="'midpoint'" ></t>
      </t>
      <div class="o-section-subtitle">
        <t t-esc="env._t('${ColorScale.MaxPoint}')"/>
      </div>
      <t t-call="${THRESHOLD_TEMPLATE}">
          <t t-set="threshold" t-value="rule.maximum" ></t>
          <t t-set="thresholdType" t-value="'maximum'" ></t>
      </t>
  </div>`;
