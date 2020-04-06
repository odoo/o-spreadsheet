import * as owl from "@odoo/owl";
import * as icons from "../icons";
import { COLOR_PICKER, COLORS } from "../top_bar";
import { CellIsRule, ConditionalFormat, Style } from "../../types";
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

const TEMPLATE = xml/* xml */ `
<div>
    <h3>Condition</h3>
    <span>Cell</span>
    <select t-model="state.condition.operator" class="o-cell-is-operator">
        <t t-foreach="Object.keys(cellIsOperators)" t-as="op" t-key="op_index">
            <option t-att-value="op" t-esc="cellIsOperators[op]"/>
        </t>
    </select>
    <input type="text" t-model="state.condition.value1" class="o-cell-is-value"/>
    <t t-if="state.condition.operator === 'Between' || state.condition.operator === 'NotBetween'">
        <input type="text" t-model="state.condition.value2"/>
    </t>
    <h3>Format</h3>

    <t t-call="${PREVIEW_TEMPLATE}">
        <t t-set="currentStyle" t-value="state.style"/>
    </t>
    <div class="o-tools">
        <div class="o-tool" title="Bold" t-att-class="{active:state.style.bold}" t-on-click="toggleTool('bold')">
            ${icons.BOLD_ICON}
        </div>
        <div class="o-tool" title="Italic" t-att-class="{active:state.style.italic}" t-on-click="toggleTool('italic')">
            ${icons.ITALIC_ICON}
        </div>
        <div class="o-tool" title="Strikethrough" t-att-class="{active:state.style.strikethrough}"
             t-on-click="toggleTool('strikethrough')">${icons.STRIKE_ICON}
        </div>
        <div class="o-tool o-dropdown o-with-color">
              <span title="Text Color" t-attf-style="border-color:{{state.style.textColor}}"
                    t-on-click.stop="toggleMenu('textColorTool')">${icons.TEXT_COLOR_ICON}</span>
            <div class="o-dropdown-content" t-if="state.textColorTool" t-on-click="setColor('textColor')">
                <t t-call="${COLOR_PICKER}"/>
            </div>
        </div>
        <div class="o-divider"/>
        <div class="o-tool  o-dropdown o-with-color">
              <span title="Fill Color" t-attf-style="border-color:{{state.style.fillColor}}"
                    t-on-click.stop="toggleMenu('fillColorTool')">${icons.FILL_COLOR_ICON}</span>
            <div class="o-dropdown-content" t-if="state.fillColorTool" t-on-click="setColor('fillColor')">
                <t t-call="${COLOR_PICKER}"/>
            </div>
        </div>
    </div>
    <div class="o-cf-buttons">
        <button t-on-click="onCancel" class="o-cf-cancel">Cancel</button>
        <button t-on-click="onSave"  class="o-cf-save">Save</button>
    </div>
</div>
`;

const CSS = css/* scss */ ``;
const cellIsOperators = {
  BeginsWith: "Begins with",
  Between: "Between",
  ContainsText: "Contains text",
  EndsWith: "Ends with",
  Equal: "Is equal to",
  GreaterThan: "Greater than",
  GreaterThanOrEqual: "Greater than or equal",
  LessThan: "Less than",
  LessThanOrEqual: "Less than or equal",
  NotBetween: "Not between",
  NotContains: "Not contains",
  NotEqual: "Not equal"
};

interface Props {
  conditionalFormat: ConditionalFormat;
  model: Model;
}

export class CellIsRuleEditor extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;

  //@ts-ignore --> used in XML template
  private cellIsOperators = cellIsOperators;
  COLORS = COLORS;

  model = this.props.model as Model;
  cf = this.props.conditionalFormat as ConditionalFormat;
  rule = this.cf.rule as CellIsRule;
  state = useState({
    condition: {
      operator: this.rule && this.rule.operator ? this.rule.operator : "Equal",
      value1: this.rule && this.rule.values.length > 0 ? this.rule.values[0] : "",
      value2: this.cf && this.rule.values.length > 1 ? this.rule.values[1] : ""
    },

    textColorTool: false,
    fillColorTool: false,
    style: {
      fillColor: this.cf && this.rule.style.fillColor,
      textColor: this.cf && this.rule.style.textColor,
      bold: this.cf && this.rule.style.bold,
      italic: this.cf && this.rule.style.italic,
      strikethrough: this.cf && this.rule.style.strikethrough
    }
  });

  toggleMenu(tool) {
    this.closeMenus();
    this.state[tool] = !this.state[tool];
  }

  toggleTool(tool: string) {
    this.state.style[tool] = !this.state.style[tool];
    this.closeMenus();
  }
  setColor(target, ev) {
    const color = ev.target.dataset.color;
    if (color) {
      this.state.style[target] = color;
      this.closeMenus();
    }
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
        style: newStyle
      }
    });
  }
  onCancel() {
    this.trigger("cancel-edit");
  }
}
