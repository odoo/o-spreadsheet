import * as owl from "@odoo/owl";
import { IconSetRule, IconThreshold, SpreadsheetEnv } from "../../../types";
import { ICONS, ICON_SETS, REFRESH } from "../../icons";
import { IconPicker } from "../../icon_picker";
import { conditionalFormattingTerms, iconSetRule } from "../translations_terms";

const { Component, useState, hooks } = owl;
const { useExternalListener } = hooks;
const { xml, css } = owl.tags;

export const ICON_SETS_TEMPLATE = xml/* xml */ `
  <div>
  <div class="o-cf-title-text">
    <t t-esc="env._t('${iconSetRule.Icons}')"/>
  </div>
    <div class="o-cf-iconsets">
      <div class="o-cf-iconset" t-foreach="['arrows', 'smiley', 'dots']" t-as="iconSet" t-on-click="setIconSet(iconSet)">
        <div class="o-cf-icon">
          <t t-raw="icons[iconSets[iconSet].good].svg"/>
        </div>
        <div class="o-cf-icon">
          <t t-raw="icons[iconSets[iconSet].neutral].svg"/>
        </div>
        <div class="o-cf-icon">
          <t t-raw="icons[iconSets[iconSet].bad].svg"/>
        </div>
      </div>
    </div>
  </div>
`;

const INFLECTION_POINTS_TEMPLATE_ROW = xml/* xml */ `
  <tr>
    <td>
      <div t-on-click.stop="toggleMenu(icon+'IconTool')">
        <div class="o-cf-icon-button">
          <t t-raw="icons[iconValue].svg"/>
        </div>
      </div>
      <IconPicker t-if="stateIconSetCF[icon+'IconTool']" t-on-icon-picked="setIcon(icon)"/>
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
        t-model="stateIconSetCF[inflectionPoint].value"
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
      <t t-set="iconValue" t-value="stateIconSetCF.upperIcon" ></t>
      <t t-set="icon" t-value="'upper'" ></t>
      <t t-set="inflectionPointValue" t-value="stateIconSetCF.upperInflectionPoint" ></t>
      <t t-set="inflectionPoint" t-value="'upperInflectionPoint'" ></t>
    </t>
    <t t-call="${INFLECTION_POINTS_TEMPLATE_ROW}">
      <t t-set="iconValue" t-value="stateIconSetCF.middleIcon" ></t>
      <t t-set="icon" t-value="'middle'" ></t>
      <t t-set="inflectionPointValue" t-value="stateIconSetCF.lowerInflectionPoint" ></t>
      <t t-set="inflectionPoint" t-value="'lowerInflectionPoint'" ></t>
    </t>
    <tr>
      <td>
        <div t-on-click.stop="toggleMenu('lowerIconTool')">
          <div class="o-cf-icon-button" >
            <t t-raw="icons[stateIconSetCF.lowerIcon].svg"/>
          </div>
        </div>
        <IconPicker t-if="stateIconSetCF['lowerIconTool']" t-on-icon-picked="setIcon('lower')"/>
      </td>
      <td><t t-esc="env._t('${iconSetRule.Else}')"/></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </table>
  </div>`;

const TEMPLATE = xml/* xml */ `
  <div class="o-cf-iconset-rule">
      <t t-call="${ICON_SETS_TEMPLATE}"/>
      <t t-call="${INFLECTION_POINTS_TEMPLATE}"/>
      <div class="btn btn-link o_refresh_measures o-cf-iconset-reverse" t-on-click="reverseIcons">
        <div class="mr-1 d-inline-block">
          <t t-raw="reverseIcon"/>
        </div>
        <t t-esc="env._t('${iconSetRule.ReverseIcons}')"/>
      </div>
  </div>`;

const CSS = css/* scss */ `
  .o-cf-iconset-rule {
    font-size: 12;
    .o-cf-iconsets {
      display: flex;
      justify-content: space-between;
      .o-cf-iconset {
        border: 1px solid #dadce0;
        border-radius: 4px;
        display: inline-flex;
        padding: 5px 8px;
        width: 25%;
        cursor: pointer;
        justify-content: space-between;
        .o-cf-icon {
          display: inline;
          margin-left: 1%;
          margin-right: 1%;
        }
        svg {
          vertical-align: baseline;
        }
      }
      .o-cf-iconset:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .o-inflection {
      .o-cf-icon-button {
        display: inline-block;
        border: 1px solid #dadce0;
        border-radius: 4px;
        cursor: pointer;
        padding: 1px 2px;
      }
      .o-cf-icon-button:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
      table {
        table-layout: fixed;
        margin-top: 2%;
        display: table;
        text-align: left;
        font-size: 12px;
        line-height: 18px;
        width: 100%;
      }
      th.o-cf-iconset-icons {
        width: 8%;
      }
      th.o-cf-iconset-text {
        width: 28%;
      }
      th.o-cf-iconset-operator {
        width: 14%;
      }
      th.o-cf-iconset-type {
        width: 28%;
      }
      th.o-cf-iconset-value {
        width: 26%;
      }
      input,
      select {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
    }
    .o-cf-iconset-reverse {
      margin-bottom: 2%;
      margin-top: 2%;
      .o-cf-label {
        display: inline-block;
        vertical-align: bottom;
        margin-bottom: 2px;
      }
    }
  }
`;

interface Props {
  rule: IconSetRule;
}

interface IconSetRuleState {
  upperInflectionPoint: IconThreshold;
  lowerInflectionPoint: IconThreshold;
  upperIcon: string;
  middleIcon: string;
  lowerIcon: string;
  reversed: boolean;
  upperIconTool: boolean;
  middleIconTool: boolean;
  lowerIconTool: boolean;
}

export class IconSetRuleEditor extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { IconPicker };
  icons = ICONS;
  iconSets = ICON_SETS;
  reverseIcon = REFRESH;

  stateIconSetCF = useState<IconSetRuleState>({
    reversed: false,
    upperInflectionPoint: this.props.rule.upperInflectionPoint,
    lowerInflectionPoint: this.props.rule.lowerInflectionPoint,
    upperIcon: this.props.rule.icons.upper,
    middleIcon: this.props.rule.icons.middle,
    lowerIcon: this.props.rule.icons.lower,
    upperIconTool: false,
    middleIconTool: false,
    lowerIconTool: false,
  });

  constructor() {
    super(...arguments);
    useExternalListener(window as any, "click", this.closeMenus);
  }

  toggleMenu(tool) {
    const current = this.stateIconSetCF[tool];
    this.closeMenus();
    this.stateIconSetCF[tool] = !current;
  }

  closeMenus() {
    this.stateIconSetCF.upperIconTool = false;
    this.stateIconSetCF.middleIconTool = false;
    this.stateIconSetCF.lowerIconTool = false;
  }

  setIconSet(iconSet: "arrows" | "smiley" | "dots") {
    this.stateIconSetCF.upperIcon = this.iconSets[iconSet].good;
    this.stateIconSetCF.middleIcon = this.iconSets[iconSet].neutral;
    this.stateIconSetCF.lowerIcon = this.iconSets[iconSet].bad;
  }

  setIcon(target: string, ev: CustomEvent) {
    this.stateIconSetCF[target + "Icon"] = ev.detail.icon;
  }

  getRule(): IconSetRule {
    const upperInflectionPoint: IconThreshold = { ...this.stateIconSetCF.upperInflectionPoint };
    const lowerInflectionPoint: IconThreshold = { ...this.stateIconSetCF.lowerInflectionPoint };
    return {
      type: "IconSetRule",
      lowerInflectionPoint,
      upperInflectionPoint,
      icons: {
        upper: this.stateIconSetCF.upperIcon,
        middle: this.stateIconSetCF.middleIcon,
        lower: this.stateIconSetCF.lowerIcon,
      },
    };
  }

  getIconsSelction() {
    return Object.keys(this.icons);
  }

  reverseIcons() {
    const upperIcon = this.stateIconSetCF.upperIcon;
    this.stateIconSetCF.upperIcon = this.stateIconSetCF.lowerIcon;
    this.stateIconSetCF.lowerIcon = upperIcon;
  }

  static getDefaultRule(): IconSetRule {
    return {
      type: "IconSetRule",
      icons: {
        upper: "arrowGood",
        middle: "arrowNeutral",
        lower: "arrowBad",
      },
      upperInflectionPoint: {
        type: "percentage",
        value: "66",
        operator: "gt",
      },
      lowerInflectionPoint: {
        type: "percentage",
        value: "33",
        operator: "gt",
      },
    };
  }
}
