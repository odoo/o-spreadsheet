import * as owl from "@odoo/owl";
import { CellIsRule, ConditionalFormat, SpreadsheetEnv, Style } from "../../types";
import { ColorPicker } from "../color_picker";
import * as icons from "../icons";
import { cellIsOperators, terms } from "./translations_terms";

const Component = owl.Component;
const { useState, hooks } = owl;
const { useExternalListener } = hooks;
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
    <div class="o-section-title" t-esc="env._t('${terms.CF_TITLE}')"></div>
    <div class="o-cf-title-text" t-esc="env._t('${terms.IS_RULE}')"></div>
    <select t-model="state.condition.operator" class="o-input o-cell-is-operator">
        <t t-foreach="Object.keys(cellIsOperators)" t-as="op" t-key="op_index">
            <option t-att-value="op" t-esc="cellIsOperators[op]"/>
        </t>
    </select>
    <input type="text" placeholder="Value" t-model="state.condition.value1" class="o-input o-cell-is-value"/>
    <t t-if="state.condition.operator === 'Between' || state.condition.operator === 'NotBetween'">
        <input type="text" placeholder="and value" t-model="state.condition.value2" class="o-input"/>
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
    <div class="o-sidePanelButtons">
      <button t-on-click="onCancel" class="o-sidePanelButton o-cf-cancel" t-esc="env._t('${terms.CANCEL}')"></button>
      <button t-on-click="onSave" class="o-sidePanelButton o-cf-save" t-esc="env._t('${terms.SAVE}')"></button>
    </div>
</div>
`;

const CSS = css/* scss */ `
  .o-cf-title-text {
    font-size: 12px;
    line-height: 14px;
    margin-bottom: 6px;
    margin-top: 18px;
  }
  .o-cf-preview-line {
    border: 1px solid darkgrey;
    padding: 10px;
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
  private cellIsOperators = cellIsOperators;

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
