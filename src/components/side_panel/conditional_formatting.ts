import * as owl from "@odoo/owl";
import { COLORS } from "../top_bar";
import { CellIsRuleEditor } from "./cell_is_rule_editor";
import { ColorScaleRuleEditor } from "./color_scale_rule_editor";
import { colorNumberString, uuidv4 } from "../../helpers/index";
import { ConditionalFormat } from "../../types";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

// TODO vsc: add ordering of rules
export const PREVIEW_TEMPLATE_SINGLE_COLOR = xml/* xml */ `
  <div class="o-cf-preview"
       t-attf-style="font-weight:{{currentStyle.bold ?'bold':'normal'}};
                     text-decoration:{{currentStyle.strikethrough ? 'line-through':'none'}};
                     font-style:{{currentStyle.italic?'italic':'normal'}};
                     color:{{currentStyle.textColor}};
                     background-color:{{currentStyle.fillColor}};"
       t-esc="previewText  || 'Preview text'" />
`;
const TEMPLATE = xml/* xml */ `
<div class="o-cf">
    <h3>Current sheet</h3>
    <div class="o-cf-preview-list" >
        <div t-on-click="onRuleClick(cf)" t-foreach="state.conditionalFormats" t-as="cf" t-key="cf.id">
          <t t-if="cf.rule.type === 'CellIsRule'">
              <t t-call="${PREVIEW_TEMPLATE_SINGLE_COLOR}">
                  <t t-set="currentStyle" t-value="cf.rule.style"/>
                  <t t-set="previewText" t-value="cf.ranges"/>
              </t>
          </t>
          <t t-else="">
            <div class="o-cf-preview" t-esc="cf.ranges  || 'Preview text'"
            t-attf-style="background-image: linear-gradient(to right, #{{colorNumberString(cf.rule.minimum.color)}}, #{{colorNumberString(cf.rule.maximum.color)}})"></div>
          </t>
        </div>
    </div>

    <t t-if="state.mode === 'edit' || state.mode === 'add'" t-key="state.currentCF.id">
        <div class="o-cf-ruleEditor">
            <h2 t-if="state.mode ==='edit'">Edit rule</h2>
            <h2 t-if="state.mode ==='add'">Add a rule</h2>
            <h3>On ranges</h3>
            <input type="text" t-model="state.currentRanges" class="o-range" placeholder="select range, ranges"/>
            <t t-if="state.mode ==='add'">
                <form>
                  <label>single color <input type="radio" name="ruleType" t-model="state.toRuleType" value="CellIsRule" t-on-change="onChangeRuleType"/></label>
                  <label>color scale <input type="radio" name="ruleType"  t-model="state.toRuleType" value="ColorScaleRule" t-on-change="onChangeRuleType"/></label>
                </form>
            </t>
            <t t-component="editors[state.currentCF.rule.type]" 
                t-key="state.currentCF.id" model="props.model"
                conditionalFormat="state.currentCF"
                t-on-cancel-edit="onCancel"
                t-on-modify-rule="onSave" />
            <div>Delete ?</div>
        </div>
    </t>
    <button t-if="state.mode === 'list'" class="o-cf-add" t-on-click.prevent.stop="onAdd">Add</button>
</div>`;

const CSS = css/* scss */ `
  .o-cf {
    min-width: 350px;
    .o-cf-preview {
      margin-bottom: 15px;
    }
    h4 {
      margin-bottom: 5px;
    }
    
    .o-cf-ruleEditor {
      .o-dropdown {
        position: relative;
        .o-dropdown-content {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          z-index: 10;
          box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
          background-color: #f6f6f6;

          .o-dropdown-item {
            padding: 7px 10px;
          }
          .o-dropdown-item:hover {
            background-color: rgba(0, 0, 0, 0.08);
          }
          .o-dropdown-line {
            display: flex;
            padding: 3px 6px;
            .o-line-item {
              width: 16px;
              height: 16px;
              margin: 1px 3px;
              &:hover {
                background-color: rgba(0, 0, 0, 0.08);
              }
            }
          }
        }
      }

      .o-tools {
        color: #333;
        font-size: 13px;
        font-family: "Lato", "Source Sans Pro", Roboto, Helvetica, Arial, sans-serif;
        cursor: default;
        display: flex;

        .o-tool {
          display: flex;
          align-items: center;
          margin: 2px;
          padding: 0 3px;
          border-radius: 2px;
        }

        .o-tool.active,
        .o-tool:not(.o-disabled):hover {
          background-color: rgba(0, 0, 0, 0.08);
        }

        .o-with-color > span {
          border-bottom: 4px solid;
          height: 16px;
          margin-top: 2px;
        }
        .o-with-color {
          .o-line-item:hover {
            outline: 1px solid gray;
          }
        }
        .o-border {
          .o-line-item {
            padding: 4px;
            margin: 1px;
          }
        }
      }
      .o-cell-content {
        font-family: monospace, arial, sans, sans-serif;
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 35px;
      }
    }
  }
    
  }
`;

export class ConditionalFormattingPanel extends Component<any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { CellIsRuleEditor, ColorScaleRuleEditor };
  colorNumberString = colorNumberString;
  COLORS = COLORS;

  model = this.props.model;
  state = useState({
    currentCF: undefined as undefined | ConditionalFormat,
    currentRanges: "",
    mode: "list" as "list" | "edit" | "add",
    conditionalFormats: this.model.getters.getConditionalFormats(),
    toRuleType: "CellIsRule"
  });

  editors = {
    CellIsRule: CellIsRuleEditor,
    ColorScaleRule: ColorScaleRuleEditor
  };

  onSave(ev: CustomEvent) {
    if (this.state.currentCF) {
      this.model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: ev.detail.rule,
          ranges: this.state.currentRanges.split(","),
          id: this.state.mode === "edit" ? this.state.currentCF.id : uuidv4()
        }
      });
    }
    this.state.mode = "list";
    this.state.conditionalFormats = this.model.getters.getConditionalFormats();
  }

  onCancel() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
  }

  onRuleClick(cf) {
    this.state.mode = "edit";
    this.state.currentCF = cf;
    this.state.currentRanges = this.state.currentCF!.ranges.join(",");
  }

  defaultCellIsRule: ConditionalFormat = {
    rule: {
      type: "CellIsRule",
      operator: "Equal",
      values: [],
      style: { fillColor: "#FF0000" }
    },
    ranges: [
      this.model.getters
        .getSelectedZones()
        .map(this.model.getters.zoneToXC)
        .join(",")
    ],
    id: uuidv4()
  };

  defaultColorScaleRule: ConditionalFormat = {
    rule: {
      minimum: { type: "value", color: 0 },
      maximum: { type: "value", color: 0xeeffee },
      type: "ColorScaleRule"
    },
    ranges: [
      this.model.getters
        .getSelectedZones()
        .map(this.model.getters.zoneToXC)
        .join(",")
    ],
    id: uuidv4()
  };

  onAdd() {
    this.state.mode = "add";
    this.state.currentCF = Object.assign({}, this.defaultCellIsRule);
    this.state.currentRanges = this.state.currentCF!.ranges.join(",");
  }
  onChangeRuleType(ev) {
    if (this.state.toRuleType === "ColorScaleRule") {
      this.state.currentCF = Object.assign({}, this.defaultColorScaleRule);
    }
    if (this.state.toRuleType === "CellIsRule") {
      this.state.currentCF = Object.assign({}, this.defaultCellIsRule);
    }
  }
}
