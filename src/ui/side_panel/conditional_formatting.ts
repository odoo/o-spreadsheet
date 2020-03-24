import * as owl from "@odoo/owl";
import { ConditionalFormat, GridModel } from "../../model";
import {
  ConditionalFormattingRuleEditor,
  PREVIEW_TEMPLATE
} from "./conditional_formatting_rule_editor";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

// TODO vsc: add ordering of rules

const TEMPLATE = xml/* xml */ `
<div class="o-cf">
    <div class="o-cf-preview-list" t-foreach="conditionalFormats" t-as="cf" t-key="cf_index">
        <div t-on-click="onRuleClick(cf)">
            <t t-call="${PREVIEW_TEMPLATE}">
                <t t-set="currentStyle" t-value="cf.style"/>
                <t t-set="previewText" t-value="cf.ranges"/>
            </t>
        </div>
    </div>

    <t t-if="state.mode === 'edit' || state.mode === 'add'">
      <ConditionalFormattingRuleEditor
              t-on-modifyRule.stop="onSave"
              t-on-cancelEdit.stop="onCancelEdit"
              model="props.model"
              conditionalFormat="state.currentCF"
              mode="state.mode"/>
    </t>
    <button t-if="state.mode === 'list'" t-on-click.prevent.stop="onAdd">Add</button>
</div>`;

const CSS = css/* scss */ `
  .o-cf {
    .o-cf-preview-list {
      height: 30px;
    }
  }
`;

export class ConditionalFormattingPanel extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ConditionalFormattingRuleEditor };

  model = this.props.model as GridModel;
  conditionalFormats = this.model.getters.getConditionalFormats();
  state = useState({
    currentCF: undefined as undefined | ConditionalFormat,
    mode: "list" as "list" | "edit" | "add"
  });

  onSave(ev: CustomEvent) {
    this.model.dispatch({
      type: "ADD_CONDITIONAL_FORMAT",
      cf: {
        ranges: ev.detail.ranges,
        formatRule: ev.detail.rule,
        style: ev.detail.style
      },
      replace: this.state.currentCF
    });
    this.state.mode = "list";
  }

  onCancelEdit() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
  }

  onRuleClick(cf) {
    this.state.mode = "edit";
    this.state.currentCF = cf;
  }
  onAdd() {
    this.state.mode = "add";
    this.state.currentCF = undefined;
  }
}
