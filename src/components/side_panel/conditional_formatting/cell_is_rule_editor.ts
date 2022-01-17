import * as owl from "@odoo/owl";
import * as icons from "../../icons";
import { conditionalFormattingTerms } from "../translations_terms";

const { xml } = owl.tags;

const PREVIEW_TEMPLATE = xml/* xml */ `
    <div class="o-cf-preview-line"
         t-attf-style="font-weight:{{currentStyle.bold ?'bold':'normal'}};
                       text-decoration:{{getTextDecoration(currentStyle)}};
                       font-style:{{currentStyle.italic?'italic':'normal'}};
                       color:{{currentStyle.textColor}};
                       border-radius: 4px;
                       background-color:{{currentStyle.fillColor}};"
         t-esc="previewText || env._t('${conditionalFormattingTerms.PREVIEW_TEXT}')" />
`;

export const TEMPLATE_CELL_IS_RULE_EDITOR = xml/* xml */ `
<div class="o-cf-cell-is-rule">
    <div class="o-cf-title-text" t-esc="env._t('${conditionalFormattingTerms.IS_RULE}')"></div>
    <select t-model="rule.operator" class="o-input o-cell-is-operator">
        <t t-foreach="Object.keys(cellIsOperators)" t-as="op" t-key="op_index">
            <option t-att-value="op" t-esc="cellIsOperators[op]"/>
        </t>
    </select>
    <t t-if="rule.operator !== 'IsEmpty' and rule.operator !== 'IsNotEmpty'">
      <input type="text"
             placeholder="Value"
             t-model="rule.values[0]"
             t-att-class="{ 'o-invalid': isValue1Invalid }"
             class="o-input o-cell-is-value o-required"/>
      <t t-if="rule.operator === 'Between' || rule.operator === 'NotBetween'">
          <input type="text"
                 placeholder="and value"
                 t-model="rule.values[1]"
                 t-att-class="{ 'o-invalid': isValue2Invalid }"
                 class="o-input o-cell-is-value o-required"/>
      </t>
    </t>
    <div class="o-cf-title-text" t-esc="env._t('${conditionalFormattingTerms.FORMATTING_STYLE}')"></div>

    <t t-call="${PREVIEW_TEMPLATE}">
        <t t-set="currentStyle" t-value="rule.style"/>
    </t>
    <div class="o-tools">
        <div class="o-tool" t-att-title="env._t('${conditionalFormattingTerms.BOLD}')" t-att-class="{active:rule.style.bold}" t-on-click="toggleStyle('bold')">
            ${icons.BOLD_ICON}
        </div>
        <div class="o-tool" t-att-title="env._t('${conditionalFormattingTerms.ITALIC}')" t-att-class="{active:rule.style.italic}" t-on-click="toggleStyle('italic')">
            ${icons.ITALIC_ICON}
        </div>
        <div class="o-tool" t-att-title="env._t('${conditionalFormattingTerms.UNDERLINE}')" t-att-class="{active:rule.style.underline}"
             t-on-click="toggleStyle('underline')">${icons.UNDERLINE_ICON}
        </div>
        <div class="o-tool" t-att-title="env._t('${conditionalFormattingTerms.STRIKE_THROUGH}')" t-att-class="{active:rule.style.strikethrough}"
             t-on-click="toggleStyle('strikethrough')">${icons.STRIKE_ICON}
        </div>
        <div class="o-tool o-dropdown o-with-color">
              <span t-att-title="env._t('${conditionalFormattingTerms.TEXT_COLOR}')" t-attf-style="border-color:{{rule.style.textColor}}"
                    t-on-click.stop="toggleMenu('cellIsRule-textColor')">
                    ${icons.TEXT_COLOR_ICON}
              </span>
              <ColorPicker t-if="state.openedMenu === 'cellIsRule-textColor'" dropdownDirection="'center'" onColorPicked="(color) => this.setColor('textColor', color)" t-key="textColor"/>
        </div>
        <div class="o-divider"/>
        <div class="o-tool o-dropdown o-with-color">
          <span t-att-title="env._t('${conditionalFormattingTerms.FILL_COLOR}')" t-attf-style="border-color:{{rule.style.fillColor}}"
                t-on-click.stop="toggleMenu('cellIsRule-fillColor')">
                ${icons.FILL_COLOR_ICON}
          </span>
          <ColorPicker t-if="state.openedMenu === 'cellIsRule-fillColor'" dropdownDirection="'center'" onColorPicked="(color) => this.setColor('fillColor', color)" t-key="fillColor"/>
        </div>
    </div>
</div>
`;
