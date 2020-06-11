import * as owl from "@odoo/owl";
import { CellIsRuleEditor } from "./cell_is_rule_editor";
import { ColorScaleRuleEditor } from "./color_scale_rule_editor";
import { colorNumberString, uuidv4 } from "../../helpers/index";
import { ConditionalFormat, SpreadsheetEnv, ColorScaleRule, SingleColorRules } from "../../types";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

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
  NotEqual: "Not equal",
};

// TODO vsc: add ordering of rules
const PREVIEW_TEMPLATE = xml/* xml */ `
<div class="o-cf-preview">
  <div t-att-style="getStyle(cf.rule)" class="o-cf-preview-image">
    123
  </div>
  <div class="o-cf-preview-description">
    <div class="o-cf-preview-ruletype">
      <div class="o-cf-preview-description-rule">
        <t t-esc="getDescription(cf)" />
      </div>
      <div class="o-cf-preview-description-values">
      <t t-if="cf.rule.values">
        <t t-esc="cf.rule.values[0]" />
        <t t-if="cf.rule.values[1]">
          and <t t-esc="cf.rule.values[1]"/>
        </t>
      </t>
      </div>
    </div>
    <div class="o-cf-preview-range" t-esc="cf.ranges"/>
  </div>
  <div class="o-cf-delete">
    <div class="o-cf-delete-button" t-on-click.stop="onDeleteClick(cf)" aria-label="Remove rule">
      x
    </div>
  </div>
</div>`;

const TEMPLATE = xml/* xml */ `
  <div class="o-cf">
    <t t-if="state.mode === 'list'">
      <div class="o-cf-preview-list" >
          <div t-on-click="onRuleClick(cf)" t-foreach="state.conditionalFormats" t-as="cf" t-key="cf.id">
              <t t-call="${PREVIEW_TEMPLATE}"/>
          </div>
      </div>
    </t>
    <t t-if="state.mode === 'edit' || state.mode === 'add'" t-key="state.currentCF.id">
        <div class="o-cf-type-selector">
          <div class="o-cf-type-tab" t-att-class="{'o-cf-tab-selected': state.toRuleType === 'CellIsRule'}" t-on-click="setRuleType('CellIsRule')">Single Color</div>
          <div class="o-cf-type-tab" t-att-class="{'o-cf-tab-selected': state.toRuleType === 'ColorScaleRule'}" t-on-click="setRuleType('ColorScaleRule')">Color Scale</div>
        </div>
        <div class="o-cf-ruleEditor">
            <div class="o-cf-range">
              <div class="o-cf-range-title">Apply to range</div>
              <input type="text" t-model="state.currentRanges" class="o-cf-range-input" placeholder="select range, ranges"/>
            </div>
            <div class="o-cf-editor">
              <t t-component="editors[state.currentCF.rule.type]"
                  t-key="state.currentCF.id"
                  conditionalFormat="state.currentCF"
                  t-on-cancel-edit="onCancel"
                  t-on-modify-rule="onSave" />
            </div>
        </div>
    </t>
    <div class="o-cf-add" t-if="state.mode === 'list'" t-on-click.prevent.stop="onAdd">
    + Add another rule
    </div>
  </div>`;

const CSS = css/* scss */ `
  .o-cf {
    min-width: 350px;
    .o-cf-type-selector{
      margin-top: 20px;
      display: flex;
      .o-cf-type-tab{
        cursor:pointer;
        flex-grow: 1;
        text-align: center;
      }
      .o-cf-tab-selected{
        text-decoration: underline;
      }
    }
    .o-cf-preview {
      background-color: #fff;
      border-bottom: 1px solid #ccc;
      cursor: pointer;
      display: flex;
      height: 60px;
      padding: 10px;
      position: relative;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
      &:not(:hover) .o-cf-delete-button {
        display: none;
      }
      .o-cf-preview-image {
        border: 1px solid lightgrey;
        height: 50px;
        line-height: 50px;
        margin-right: 15px;
        position: absolute;
        text-align: center;
        width: 50px;
      }
      .o-cf-preview-description {
        left: 65px;
        margin-bottom: auto;
        margin-right: 8px;
        margin-top: auto;
        position: relative;
        width: 142px;
        .o-cf-preview-description-rule {
          margin-bottom: 4px;
          overflow: hidden;
        }
        .o-cf-preview-description-values{
          overflow: hidden;
        }
        .o-cf-preview-range{
          font-size: 12px;
          overflow: hidden;
        }
      }
      .o-cf-delete{
        height: 56px;
        left: 250px;
        line-height: 56px;
        position: absolute;
      }
    }
    .o-cf-ruleEditor {
      .o-cf-range {
        padding: 10px;
        .o-cf-range-title{
          font-size: 14px;
          margin-bottom: 20px;
          margin-top: 20px;
        }
      }
      .o-cf-range-input{
        border-radius: 4px;
        border: 1px solid lightgrey;
        padding: 5px;
        width: 90%;
      }
      .o-cf-editor{
        padding:10px;
      }
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
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 35px;
      }
    }
    .o-cf-add {
      font-size: 14px;
      height: 36px;
      padding: 20px 24px 11px 24px;
      height: 44px;
      cursor: pointer;
    }
  }
  }`;

export class ConditionalFormattingPanel extends Component<{}, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { CellIsRuleEditor, ColorScaleRuleEditor };
  colorNumberString = colorNumberString;
  getters = this.env.getters;

  //@ts-ignore --> used in XML template
  private cellIsOperators = cellIsOperators;
  state = useState({
    currentCF: undefined as undefined | ConditionalFormat,
    currentRanges: "",
    mode: "list" as "list" | "edit" | "add",
    conditionalFormats: this.getters.getConditionalFormats(),
    toRuleType: "CellIsRule",
  });

  editors = {
    CellIsRule: CellIsRuleEditor,
    ColorScaleRule: ColorScaleRuleEditor,
  };

  getStyle(rule: SingleColorRules | ColorScaleRule): string {
    if (rule.type === "CellIsRule") {
      const cellRule = rule as SingleColorRules;
      const fontWeight = cellRule.style.bold ? "bold" : "normal";
      const fontDecoration = cellRule.style.strikethrough ? "line-through" : "none";
      const fontStyle = cellRule.style.italic ? "italic" : "normal";
      const color = cellRule.style.textColor || "none";
      const backgroundColor = cellRule.style.fillColor || "none";
      return `font-weight:${fontWeight}
               text-decoration:${fontDecoration};
               font-style:${fontStyle};
               color:${color};
               background-color:${backgroundColor};`;
    } else {
      const colorScale = rule as ColorScaleRule;
      return `background-image: linear-gradient(to right, #${colorNumberString(
        colorScale.minimum.color
      )}, #${colorNumberString(colorScale.maximum.color)})`;
    }
  }

  getDescription(cf: ConditionalFormat): string {
    return cf.rule.type === "CellIsRule" ? cellIsOperators[cf.rule.operator] : "Color scale";
  }

  onSave(ev: CustomEvent) {
    if (this.state.currentCF) {
      this.env.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: ev.detail.rule,
          ranges: this.state.currentRanges.split(","),
          id: this.state.mode === "edit" ? this.state.currentCF.id : uuidv4(),
        },
      });
    }
    this.state.mode = "list";
    this.state.conditionalFormats = this.getters.getConditionalFormats();
  }

  onCancel() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
  }

  onDeleteClick(cf: ConditionalFormat) {
    this.env.dispatch("REMOVE_CONDITIONAL_FORMAT", { id: cf.id });
    this.state.conditionalFormats = this.getters.getConditionalFormats();
  }
  onRuleClick(cf) {
    this.state.mode = "edit";
    this.state.currentCF = cf;
    this.state.toRuleType = cf.rule.type === "CellIsRule" ? "CellIsRule" : "ColorScaleRule";
    this.state.currentRanges = this.state.currentCF!.ranges.join(",");
  }

  defaultCellIsRule: ConditionalFormat = {
    rule: {
      type: "CellIsRule",
      operator: "Equal",
      values: [],
      style: { fillColor: "#FF0000" },
    },
    ranges: [this.getters.getSelectedZones().map(this.getters.zoneToXC).join(",")],
    id: uuidv4(),
  };

  defaultColorScaleRule: ConditionalFormat = {
    rule: {
      minimum: { type: "value", color: 0 },
      maximum: { type: "value", color: 0xeeffee },
      type: "ColorScaleRule",
    },
    ranges: [this.getters.getSelectedZones().map(this.getters.zoneToXC).join(",")],
    id: uuidv4(),
  };

  onAdd() {
    this.state.mode = "add";
    this.state.currentCF = Object.assign({}, this.defaultCellIsRule);
    this.state.currentRanges = this.state.currentCF!.ranges.join(",");
  }

  setRuleType(ruleType: string) {
    if (ruleType === "ColorScaleRule") {
      this.state.currentCF = Object.assign({}, this.defaultColorScaleRule);
    }
    if (ruleType === "CellIsRule") {
      this.state.currentCF = Object.assign({}, this.defaultCellIsRule);
    }
    this.state.toRuleType = ruleType;
  }
}
