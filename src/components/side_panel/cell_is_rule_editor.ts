import * as owl from "@odoo/owl";
import * as icons from "../icons";
import { ColorPicker } from "../color_picker";
import { CellIsRule, ConditionalFormat, SpreadsheetEnv, Style } from "../../types";
import { _lt } from "../../translation";
import { terms } from "./translations_terms";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

export const PREVIEW_TEMPLATE = xml/* xml */ `
    <div class="o-cf-preview-line"
         t-attf-style="font-weight:{{currentStyle.bold ?'bold':'normal'}};
                       text-decoration:{{currentStyle.strikethrough ? 'line-through':'none'}};
                       font-style:{{currentStyle.italic?'italic':'normal'}};
                       color:{{currentStyle.textColor}};
                       background-color:{{currentStyle.fillColor}};"
         t-esc="previewText || env._t('${terms.PREVIEWTEXT}')" />
`;

const TEMPLATE = xml/* xml */ `
<div>
    <div class="o-cf-title-format" t-esc="env._t('${terms.CF_TITLE}')"></div>
    <div class="o-cf-title-text" t-esc="env._t('${terms.IS_RULE}')"></div>
    <select t-model="state.condition.operator" class="o-cell-is-operator">
        <t t-foreach="Object.keys(cellIsOperators)" t-as="op" t-key="op_index">
            <option t-att-value="op" t-esc="cellIsOperators[op]"/>
        </t>
    </select>
    <input type="text" placeholder="Value" t-model="state.condition.value1" class="o-cell-is-value"/>
    <t t-if="state.condition.operator === 'Between' || state.condition.operator === 'NotBetween'">
        <input type="text" t-model="state.condition.value2"/>
    </t>
    <div class="o-cf-title-text" t-esc="env._t('${terms.FORMATTING_STYLE}')"></div>

    <t t-call="${PREVIEW_TEMPLATE}">
        <t t-set="currentStyle" t-value="state.style"/>
    </t>
    <div class="o-tools">
        <div class="o-tool" t-att-title="env._t('${terms.BOLD}')" t-att-class="{active:state.style.bold}" t-on-click="toggleTool('bold')">
            ${icons.BOLD_ICON}
        </div>
        <div class="o-tool" t-att-title="env._t('${terms.ITALIC}')" t-att-class="{active:state.style.italic}" t-on-click="toggleTool('italic')">
            ${icons.ITALIC_ICON}
        </div>
        <div class="o-tool" t-att-title="env._t('${terms.STRIKETHROUGH}')" t-att-class="{active:state.style.strikethrough}"
             t-on-click="toggleTool('strikethrough')">${icons.STRIKE_ICON}
        </div>
        <div class="o-tool o-dropdown o-with-color">
              <span t-att-title="env._t('${terms.TEXTCOLOR}')" t-attf-style="border-color:{{state.style.textColor}}"
                    t-on-click.stop="toggleMenu('textColorTool')">${icons.TEXT_COLOR_ICON}</span>
                    <ColorPicker t-if="state.textColorTool" t-on-color-picked="setColor('textColor')" t-key="textColor"/>
        </div>
        <div class="o-divider"/>
        <div class="o-tool  o-dropdown o-with-color">
              <span t-att-title="env._t('${terms.FILLCOLOR}')" t-attf-style="border-color:{{state.style.fillColor}}"
                    t-on-click.stop="toggleMenu('fillColorTool')">${icons.FILL_COLOR_ICON}</span>
                    <ColorPicker t-if="state.fillColorTool" t-on-color-picked="setColor('fillColor')" t-key="fillColor"/>
        </div>
    </div>
    <div class="o-cf-buttons">
      <button t-on-click="onCancel" class="o-cf-button o-cf-cancel" t-esc="env._t('${terms.CANCEL}')"></button>
      <button t-on-click="onSave" class="o-cf-button o-cf-save" t-esc="env._t('${terms.SAVE}')"></button>
    </div>
</div>
`;

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
  .o-cell-is-operator {
    background-color: white;
    margin-top: 5px;
    margin-bottom: 5px;
    border-radius: 4px;
    font-size: 14px;
    border: 1px solid lightgrey;
    padding: 5px;
    text-align: left;
    width: 90%;
  }
  .o-cell-is-value {
    border-radius: 4px;
    border: 1px solid lightgrey;
    padding: 5px;
    width: 90%;
  }
  .o-cf-preview-line {
    border: 1px solid darkgrey;
    padding: 10px;
  }
  .o-cf-buttons {
    padding: 12px;
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
      margin-left: 8px;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
  }
`;

interface Props {
  conditionalFormat: ConditionalFormat;
}

export class CellIsRuleEditor extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ColorPicker };

  // @ts-ignore   used in XML template
  private cellIsOperators = {
    BeginsWith: _lt("Begins with"),
    Between: _lt("Between"),
    ContainsText: _lt("Contains text"),
    EndsWith: _lt("Ends with"),
    Equal: _lt("Is equal to"),
    GreaterThan: _lt("Greater than"),
    GreaterThanOrEqual: _lt("Greater than or equal"),
    LessThan: _lt("Less than"),
    LessThanOrEqual: _lt("Less than or equal"),
    NotBetween: _lt("Not between"),
    NotContains: _lt("Not contains"),
    NotEqual: _lt("Not equal"),
  };

  cf = this.props.conditionalFormat as ConditionalFormat;
  rule = this.cf.rule as CellIsRule;
  state = useState({
    condition: {
      operator: this.rule && this.rule.operator ? this.rule.operator : "Equal",
      value1: this.rule && this.rule.values.length > 0 ? this.rule.values[0] : "",
      value2: this.cf && this.rule.values.length > 1 ? this.rule.values[1] : "",
    },

    textColorTool: false,
    fillColorTool: false,
    style: {
      fillColor: this.cf && this.rule.style.fillColor,
      textColor: this.cf && this.rule.style.textColor,
      bold: this.cf && this.rule.style.bold,
      italic: this.cf && this.rule.style.italic,
      strikethrough: this.cf && this.rule.style.strikethrough,
    },
  });

  toggleMenu(tool) {
    this.closeMenus();
    this.state[tool] = !this.state[tool];
  }

  toggleTool(tool: string) {
    this.state.style[tool] = !this.state.style[tool];
    this.closeMenus();
  }
  setColor(target: string, ev: CustomEvent) {
    const color = ev.detail.color;
    this.state.style[target] = color;
    this.closeMenus();
  }
  closeMenus() {
    this.state.textColorTool = false;
    this.state.fillColorTool = false;
  }

  onSave() {
    const newStyle: Style = {};
    const style = this.state.style;
    if (style.bold !== undefined) {
      newStyle.bold = style.bold;
    }
    if (style.italic !== undefined) {
      newStyle.italic = style.italic;
    }
    if (style.strikethrough !== undefined) {
      newStyle.strikethrough = style.strikethrough;
    }
    if (style.fillColor) {
      newStyle.fillColor = style.fillColor;
    }
    if (style.textColor) {
      newStyle.textColor = style.textColor;
    }

    this.trigger("modify-rule", {
      rule: {
        type: "CellIsRule",
        operator: this.state.condition.operator,
        values: [this.state.condition.value1, this.state.condition.value2],
        stopIfTrue: false,
        style: newStyle,
      },
    });
  }
  onCancel() {
    this.trigger("cancel-edit");
  }
}
