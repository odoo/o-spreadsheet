import { xml } from "@odoo/owl";
import { REFRESH } from "../../icons";
import { conditionalFormattingTerms, iconSetRule } from "../translations_terms";

const ICON_SETS_TEMPLATE = xml/* xml */ `
  <div>
  <div class="o-cf-title-text">
    <t t-esc="env._t('${iconSetRule.Icons}')"/>
  </div>
    <div class="o-cf-iconsets">
      <div class="o-cf-iconset" t-foreach="['arrows', 'smiley', 'dots']" t-as="iconSet" t-key="iconSet" t-on-click="(ev) => this.setIconSet(iconSet, ev)">
        <div class="o-cf-icon">
          <t t-out="icons[iconSets[iconSet].good].svg"/>
        </div>
        <div class="o-cf-icon">
          <t t-out="icons[iconSets[iconSet].neutral].svg"/>
        </div>
        <div class="o-cf-icon">
          <t t-out="icons[iconSets[iconSet].bad].svg"/>
        </div>
      </div>
    </div>
  </div>
`;

const INFLECTION_POINTS_TEMPLATE_ROW = xml/* xml */ `
  <tr>
    <td>
      <div t-on-click.stop="(ev) => this.toggleMenu('iconSet-'+icon+'Icon', ev)">
        <div class="o-cf-icon-button">
          <t t-out="icons[iconValue].svg"/>
        </div>
      </div>
      <IconPicker t-if="state.openedMenu === 'iconSet-'+icon+'Icon'" onIconPicked="(i) => this.setIcon(icon, i)"/>
    </td>
    <td>
      <t t-esc="env._t('${iconSetRule.WhenValueIs}')"/>
    </td>
    <td>
      <select class="o-input" name="valueType" t-model="inflectionPointValue.operator">
        <option value="gt">
          <span>&#62;</span>
        </option>
        <option value="ge">
          <span>&#8805;</span>
        </option>
      </select>
    </td>
    <td>
      <input type="text" class="o-input"
        t-att-class="{ 'o-invalid': isInflectionPointInvalid(inflectionPoint) }"
        t-model="rule[inflectionPoint].value"
      />
    </td>
    <td>
      <select class="o-input" name="valueType" t-model="inflectionPointValue.type">
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
    </td>
  </tr>
`;

const INFLECTION_POINTS_TEMPLATE = xml/* xml */ `
  <div class="o-inflection">
    <table>
    <tr>
      <th class="o-cf-iconset-icons"></th>
      <th class="o-cf-iconset-text"></th>
      <th class="o-cf-iconset-operator"></th>
      <th class="o-cf-iconset-value">
      <t t-esc="env._t('${iconSetRule.Value}')"/>
      </th>
      <th class="o-cf-iconset-type">
      <t t-esc="env._t('${iconSetRule.Type}')"/>
      </th>
    </tr>
    <t t-call="${INFLECTION_POINTS_TEMPLATE_ROW}">
      <t t-set="iconValue" t-value="rule.icons.upper" ></t>
      <t t-set="icon" t-value="'upper'" ></t>
      <t t-set="inflectionPointValue" t-value="rule.upperInflectionPoint" ></t>
      <t t-set="inflectionPoint" t-value="'upperInflectionPoint'" ></t>
    </t>
    <t t-call="${INFLECTION_POINTS_TEMPLATE_ROW}">
      <t t-set="iconValue" t-value="rule.icons.middle" ></t>
      <t t-set="icon" t-value="'middle'" ></t>
      <t t-set="inflectionPointValue" t-value="rule.lowerInflectionPoint" ></t>
      <t t-set="inflectionPoint" t-value="'lowerInflectionPoint'" ></t>
    </t>
    <tr>
      <td>
        <div t-on-click.stop="(ev) => this.toggleMenu('iconSet-lowerIcon', ev)">
          <div class="o-cf-icon-button" >
            <t t-out="icons[rule.icons.lower].svg"/>
          </div>
        </div>
        <IconPicker t-if="state.openedMenu === 'iconSet-lowerIcon'" onIconPicked="(icon) => setIcon('lower', icon)"/>
      </td>
      <td><t t-esc="env._t('${iconSetRule.Else}')"/></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </table>
  </div>`;

export const TEMPLATE_ICON_SET_EDITOR = xml/* xml */ `
  <div class="o-cf-iconset-rule">
      <t t-call="${ICON_SETS_TEMPLATE}"/>
      <t t-call="${INFLECTION_POINTS_TEMPLATE}"/>
      <div class="btn btn-link o_refresh_measures o-cf-iconset-reverse" t-on-click="reverseIcons">
        <div class="mr-1 d-inline-block">
          ${REFRESH}
        </div>
        <t t-esc="env._t('${iconSetRule.ReverseIcons}')"/>
      </div>
  </div>`;
