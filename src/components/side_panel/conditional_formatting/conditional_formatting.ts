import * as owl from "@odoo/owl";
import { colorNumberString, toZone, uuidv4 } from "../../../helpers/index";
import {
  ColorScaleRule,
  CommandResult,
  ConditionalFormat,
  SingleColorRules,
  SpreadsheetEnv,
  Zone,
} from "../../../types";
import { ICONS, TRASH } from "../../icons";
import { SelectionInput } from "../../selection_input";
import { cellIsOperators, conditionalFormatingTerms, GenericWords } from "../translations_terms";
import { CellIsRuleEditor } from "./cell_is_rule_editor";
import { ColorScaleRuleEditor } from "./color_scale_rule_editor";
import { IconSetRuleEditor } from "./icon_set_rule_editor";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

// TODO vsc: add ordering of rules
const PREVIEW_TEMPLATE = xml/* xml */ `
<div class="o-cf-preview">
  <t t-if="cf.rule.type==='IconSetRule'">
    <div class="o-cf-preview-icon">
      <t t-raw="icons[cf.rule.icons.upper].svg"/>
      <t t-raw="icons[cf.rule.icons.middle].svg"/>
      <t t-raw="icons[cf.rule.icons.lower].svg"/>
    </div>
  </t>
  <t t-else="">
    <div t-att-style="getStyle(cf.rule)" class="o-cf-preview-image">
      123
    </div>
  </t>
  <div class="o-cf-preview-description">
    <div class="o-cf-preview-ruletype">
      <div class="o-cf-preview-description-rule">
        <t t-esc="getDescription(cf)" />
      </div>
      <div class="o-cf-preview-description-values">
      <t t-if="cf.rule.values">
        <t t-esc="cf.rule.values[0]" />
        <t t-if="cf.rule.values[1]">
        <t t-esc="' ' + env._t('${GenericWords.And}')"/> <t t-esc="cf.rule.values[1]"/>
        </t>
      </t>
      </div>
    </div>
    <div class="o-cf-preview-range" t-esc="cf.ranges"/>
  </div>
  <div class="o-cf-delete">
    <div class="o-cf-delete-button" t-on-click.stop="onDeleteClick(cf)" aria-label="Remove rule">
      <t t-raw="trashIcon"/>
    </div>
  </div>
</div>`;

const TEMPLATE = xml/* xml */ `
  <div class="o-cf">
    <t t-if="state.mode === 'list'">
      <div class="o-cf-preview-list" >
          <div t-on-click="onRuleClick(cf)" t-foreach="conditionalFormats" t-as="cf" t-key="cf.id">
              <t t-call="${PREVIEW_TEMPLATE}"/>
          </div>
      </div>
    </t>
    <t t-if="state.mode === 'edit' || state.mode === 'add'" t-key="state.currentCF.id">
        <div class="o-cf-ruleEditor">
            <div class="o-section o-cf-range">
              <div class="o-section-title">Apply to range</div>
              <div class="o-selection-cf">
                <SelectionInput ranges="state.currentRanges" class="o-range" t-on-selection-changed="onRangesChanged"/>
              </div>
              <div class="o-section-title" t-esc="env._t('${conditionalFormatingTerms.CF_TITLE}')"></div>
              <div class="o_field_radio o_horizontal o_field_widget o-cf-type-selector">
                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="setRuleType('CellIsRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.toRuleType === 'CellIsRule'}}" type="radio" id="cellIsRule" name="ruleType" value="CellIsRule"/>
                  <label for="cellIsRule" class="custom-control-label o_form_label">
                    <t t-esc="env._t('${conditionalFormatingTerms.SingleColor}')"/>
                  </label>
                </div>
                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="setRuleType('ColorScaleRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.toRuleType === 'ColorScaleRule'}}" type="radio" id="colorScaleRule" name="ruleType" value="ColorScaleRule"/>
                  <label for="colorScaleRule" class="custom-control-label o_form_label">
                  <t t-esc="env._t('${conditionalFormatingTerms.ColorScale}')"/>
                  </label>
                </div>

                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="setRuleType('IconSetRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.toRuleType === 'IconSetRule'}}" type="radio" id="iconSetRule" name="ruleType" value="IconSetRule"/>
                  <label for="iconSetRule" class="custom-control-label o_form_label">
                  <t t-esc="env._t('${conditionalFormatingTerms.IconSet}')"/>
                  </label>
                </div>
              </div>
            </div>
            <div class="o-section">
              <t t-component="editors[state.currentCF.rule.type]"
                  t-key="state.currentCF.id"
                  conditionalFormat="state.currentCF"
                  error="state.error"
                  t-on-cancel-edit="onCancel"
                  t-on-modify-rule="onSave"
                  class="o-cf-editor" />
            </div>
        </div>
    </t>
    <div class="btn btn-link o-cf-add" t-if="state.mode === 'list'" t-on-click.prevent.stop="onAdd">
    <t t-esc="'+ ' + env._t('${conditionalFormatingTerms.newRule}')"/>
    </div>
  </div>`;

const CSS = css/* scss */ `
  label{
    vertical-align: middle;
  }
  .o_cf_radio_item{
      margin-right: 10%;
  }
  .radio input:checked {
    color: #e9ecef;
    border-color: #00A09D;
    background-color: #00A09D;
  }
  .o-cf-editor{
    border-bottom: solid;
    border-color: lightgrey;
  }
  .o-cf {
    .o-cf-type-selector{
      *, ::after, ::before {
        box-sizing: border-box;
      }
      margin-top: 10px;
      display: flex;
    }
    .o-cf-title-text {
      color: gray;
      font-size: 12px;
      line-height: 14px;
      margin: 8px 0 4px 0;
    }
    .o-cf-title-text:first-child {
      margin-top: 0px;
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
      .o-cf-preview-icon{
        border: 1px solid lightgrey;
        position: absolute;
        height: 50px;
        line-height: 50px;
        margin-right: 15px;
        display: flex;
        justify-content: space-around;
        align-items: center;
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
          text-overflow: ellipsis;
          font-size: 12px;
          overflow: hidden;
        }
      }
      .o-cf-delete{
        color:dimgrey;
        left: 90%;
        top: 39%;
        position: absolute;
      }
    }
    .o-cf-ruleEditor {
      font-size: 12px;
      line-height: 1.5;
      .o-selection-cf{
        margin-bottom: 3%;
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
      padding: 20px 24px 11px 24px;
      height: 44px;
      cursor: pointer;
      text-decoration: none;
    }
    .o-cf-add:hover {
      color: #003a39;
      text-decoration: none;
    }
    .o-cf-error {
      color: red;
      margin-top: 10px;
    }
  }
  }`;
interface Props {
  selection: Zone | undefined;
}
export class ConditionalFormattingPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  icons = ICONS;
  trashIcon = TRASH;
  static components = { CellIsRuleEditor, ColorScaleRuleEditor, SelectionInput };
  colorNumberString = colorNumberString;
  getters = this.env.getters;

  //@ts-ignore --> used in XML template
  private cellIsOperators = cellIsOperators;
  state = useState({
    currentCF: undefined as undefined | ConditionalFormat,
    currentRanges: [] as string[],
    mode: "list" as "list" | "edit" | "add",
    toRuleType: "CellIsRule",
    error: undefined as string | undefined,
  });

  editors = {
    CellIsRule: CellIsRuleEditor,
    ColorScaleRule: ColorScaleRuleEditor,
    IconSetRule: IconSetRuleEditor,
  };

  constructor(parent, props) {
    super(parent, props);
    const sheetId = this.getters.getActiveSheetId();
    if (props.selection && this.getters.getRulesSelection(sheetId, props.selection).length === 1) {
      this.openCf(this.getters.getRulesSelection(sheetId, props.selection)[0]);
    }
  }

  get conditionalFormats(): ConditionalFormat[] {
    return this.getters.getConditionalFormats(this.getters.getActiveSheetId());
  }

  async willUpdateProps(nextProps) {
    if (nextProps.selection && nextProps.selection !== this.props.selection) {
      const sheetId = this.getters.getActiveSheetId();
      if (
        nextProps.selection &&
        this.getters.getRulesSelection(sheetId, nextProps.selection).length === 1
      ) {
        this.openCf(this.getters.getRulesSelection(sheetId, nextProps.selection)[0]);
      } else {
        this.resetState();
      }
    }
  }

  resetState() {
    this.state.currentCF = undefined;
    this.state.currentRanges = [];
    this.state.mode = "list";
    this.state.toRuleType = "CellIsRule";
  }

  getStyle(rule: SingleColorRules | ColorScaleRule): string {
    if (rule.type === "CellIsRule") {
      const cellRule = rule as SingleColorRules;
      const fontWeight = cellRule.style.bold ? "bold" : "normal";
      const fontDecoration = cellRule.style.strikethrough ? "line-through" : "none";
      const fontStyle = cellRule.style.italic ? "italic" : "normal";
      const color = cellRule.style.textColor || "none";
      const backgroundColor = cellRule.style.fillColor || "none";
      return `font-weight:${fontWeight};
               text-decoration:${fontDecoration};
               font-style:${fontStyle};
               color:${color};
               background-color:${backgroundColor};`;
    }
    if (rule.type === "ColorScaleRule") {
      const colorScale = rule as ColorScaleRule;
      const minColor = colorNumberString(colorScale.minimum.color);
      const midColor = colorScale.midpoint ? colorNumberString(colorScale.midpoint.color) : null;
      const maxColor = colorNumberString(colorScale.maximum.color);
      const baseString = "background-image: linear-gradient(to right, #";
      return midColor
        ? baseString + minColor + ", #" + midColor + ", #" + maxColor + ")"
        : baseString + minColor + ", #" + maxColor + ")";
    } else {
      return "";
    }
  }

  getDescription(cf: ConditionalFormat): string {
    switch (cf.rule.type) {
      case "CellIsRule":
        return cellIsOperators[cf.rule.operator];
      case "ColorScaleRule":
        return "Color scale";
      case "IconSetRule":
        return "Icon Set";
      default:
        return "";
    }
  }

  onSave(ev: CustomEvent) {
    if (this.state.currentCF) {
      const result = this.env.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: ev.detail.rule,
          id: this.state.mode === "edit" ? this.state.currentCF.id : uuidv4(),
        },
        target: this.state.currentRanges.map(toZone),
        sheetId: this.getters.getActiveSheetId(),
      });
      if (result !== CommandResult.Success) {
        this.state.error = this.env._t(
          conditionalFormatingTerms.Errors[result] || conditionalFormatingTerms.Errors.unexpected
        );
      } else {
        this.state.error = undefined;
        this.state.mode = "list";
        this.state.toRuleType = "CellIsRule";
      }
    }
  }

  onCancel() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
    this.state.toRuleType = "CellIsRule";
  }

  onDeleteClick(cf: ConditionalFormat) {
    this.env.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: cf.id,
      sheetId: this.getters.getActiveSheetId(),
    });
  }
  onRuleClick(cf) {
    this.state.mode = "edit";
    this.state.currentCF = cf;
    this.state.toRuleType = cf.rule.type;
    this.state.currentRanges = this.state.currentCF!.ranges;
  }

  openCf(cfId) {
    const cfIndex = this.conditionalFormats.findIndex((c) => c.id === cfId);
    const cf = this.conditionalFormats[cfIndex];
    if (cf) {
      this.state.mode = "edit";
      this.state.currentCF = cf;
      this.state.toRuleType = cf.rule.type;
      this.state.currentRanges = this.state.currentCF!.ranges;
    }
  }

  defaultCellIsRule(): ConditionalFormat {
    return {
      rule: {
        type: "CellIsRule",
        operator: "IsNotEmpty",
        values: [],
        style: { fillColor: "#b6d7a8" },
      },
      ranges: this.getters
        .getSelectedZones()
        .map((zone) => this.getters.zoneToXC(this.getters.getActiveSheetId(), zone)),
      id: uuidv4(),
    };
  }

  defaultColorScaleRule(): ConditionalFormat {
    return {
      rule: {
        minimum: { type: "value", color: 0xffffff },
        midpoint: undefined,
        maximum: { type: "value", color: 0x6aa84f },
        type: "ColorScaleRule",
      },
      ranges: this.getters
        .getSelectedZones()
        .map((zone) => this.getters.zoneToXC(this.getters.getActiveSheetId(), zone)),
      id: uuidv4(),
    };
  }

  defaultIconSetRule(): ConditionalFormat {
    return {
      rule: {
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
      },
      ranges: this.getters
        .getSelectedZones()
        .map((zone) => this.getters.zoneToXC(this.getters.getActiveSheetId(), zone)),
      id: uuidv4(),
    };
  }

  onAdd() {
    this.state.mode = "add";
    this.state.currentCF = this.defaultCellIsRule();
    this.state.currentRanges = this.state.currentCF!.ranges;
  }

  setRuleType(ruleType: string) {
    if (ruleType === this.state.toRuleType) {
      return;
    }
    if (ruleType === "ColorScaleRule") {
      this.state.currentCF = this.defaultColorScaleRule();
    }
    if (ruleType === "CellIsRule") {
      this.state.currentCF = this.defaultCellIsRule();
    }
    if (ruleType === "IconSetRule") {
      this.state.currentCF = this.defaultIconSetRule();
    }
    this.state.toRuleType = ruleType;
  }

  onRangesChanged({ detail }: { detail: { ranges: string[] } }) {
    this.state.currentRanges = detail.ranges;
  }
}
