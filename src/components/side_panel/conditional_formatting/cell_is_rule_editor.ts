import { xml } from "@odoo/owl";
import * as icons from "../../icons";
import { CfTerms, GenericTerms } from "../../translations_terms";

const PREVIEW_TEMPLATE = xml/* xml */ `
    <div class="o-cf-preview-line"
         t-attf-style="font-weight:{{currentStyle.bold ?'bold':'normal'}};
                       text-decoration:{{getTextDecoration(currentStyle)}};
                       font-style:{{currentStyle.italic?'italic':'normal'}};
                       color:{{currentStyle.textColor}};
                       border-radius: 4px;
                       background-color:{{currentStyle.fillColor}};"
         t-esc="previewText || env._t('${CfTerms.PreviewText}')" />
`;

export const TEMPLATE_CELL_IS_RULE_EDITOR = xml/* xml */ `
<div class="o-cf-cell-is-rule">
    <div class="o-section-subtitle" t-esc="env._t('${CfTerms.IsRule}')"></div>
    <select t-model="rule.operator" class="o-input o-cell-is-operator">
        <t t-foreach="Object.keys(cellIsOperators)" t-as="op" t-key="op_index">
            <option t-att-value="op" t-esc="cellIsOperators[op]"/>
        </t>
    </select>
    <t t-if="rule.operator !== 'IsEmpty' and rule.operator !== 'IsNotEmpty'">
      <input type="text"
             placeholder="${GenericTerms.Value}"
             t-model="rule.values[0]"
             t-att-class="{ 'o-invalid': isValue1Invalid }"
             class="o-input o-cell-is-value o-required"/>
      <t t-if="rule.operator === 'Between' || rule.operator === 'NotBetween'">
          <input type="text"
                 placeholder="${GenericTerms.AndValue}"
                 t-model="rule.values[1]"
                 t-att-class="{ 'o-invalid': isValue2Invalid }"
                 class="o-input o-cell-is-value o-required"/>
      </t>
    </t>
    <div class="o-section-subtitle" t-esc="env._t('${CfTerms.FormattingStyle}')"></div>

    <t t-call="${PREVIEW_TEMPLATE}">
        <t t-set="currentStyle" t-value="rule.style"/>
    </t>
    <div class="o-tools">
        <div class="o-tool" title="${GenericTerms.Bold}" t-att-class="{active:rule.style.bold}" t-on-click="() => this.toggleStyle('bold')">
            ${icons.BOLD_ICON}
        </div>
        <div class="o-tool" title="${GenericTerms.Italic}" t-att-class="{active:rule.style.italic}" t-on-click="() => this.toggleStyle('italic')">
            ${icons.ITALIC_ICON}
        </div>
        <div class="o-tool" title="${GenericTerms.Underline}" t-att-class="{active:rule.style.underline}"
             t-on-click="(ev) => this.toggleStyle('underline', ev)">${icons.UNDERLINE_ICON}
        </div>
        <div class="o-tool" title="${GenericTerms.Strikethrough}" t-att-class="{active:rule.style.strikethrough}"
             t-on-click="(ev) => this.toggleStyle('strikethrough', ev)">${icons.STRIKE_ICON}
        </div>
        <div class="o-tool o-dropdown o-with-color">
              <span title="${GenericTerms.TextColor}" t-attf-style="border-color:{{rule.style.textColor}}"
                    t-on-click.stop="(ev) => this.toggleMenu('cellIsRule-textColor', ev)">
                    ${icons.TEXT_COLOR_ICON}
              </span>
              <ColorPicker t-if="state.openedMenu === 'cellIsRule-textColor'" dropdownDirection="'center'" onColorPicked="(color) => this.setColor('textColor', color)" t-key="textColor"/>
        </div>
        <div class="o-divider"/>
        <div class="o-tool o-dropdown o-with-color">
          <span title="${GenericTerms.FillColor}" t-attf-style="border-color:{{rule.style.fillColor}}"
                t-on-click.stop="(ev) => this.toggleMenu('cellIsRule-fillColor', ev)">
                ${icons.FILL_COLOR_ICON}
          </span>
          <ColorPicker t-if="state.openedMenu === 'cellIsRule-fillColor'" dropdownDirection="'center'" onColorPicked="(color) => this.setColor('fillColor', color)" t-key="fillColor"/>
        </div>
    </div>
</div>
`;
