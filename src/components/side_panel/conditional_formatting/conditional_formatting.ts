import * as owl from "@odoo/owl";
import { rangeReference } from "../../../formulas";
import { colorNumberString, toZone } from "../../../helpers/index";
import {
  ColorScaleRule,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatRule,
  SingleColorRules,
  SpreadsheetEnv,
  Zone,
} from "../../../types";
import { ICONS, TRASH } from "../../icons";
import { SelectionInput } from "../../selection_input";
import { cellIsOperators, conditionalFormattingTerms, GenericWords } from "../translations_terms";
import { CellIsRuleEditor } from "./cell_is_rule_editor";
import { ColorScaleRuleEditor } from "./color_scale_rule_editor";
import { IconSetRuleEditor } from "./icon_set_rule_editor";

const { Component, useState } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;

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
    <div class="o-cf-delete-button" t-on-click.stop="deleteConditionalFormat(cf)" aria-label="Remove rule">
    <t t-raw="trashIcon"/>
    </div>
  </div>
</div>`;

const TEMPLATE = xml/* xml */ `
  <div class="o-cf">
    <t t-if="state.mode === 'list'">
      <div class="o-cf-preview-list" >
        <div t-on-click="editConditionalFormat(cf)" t-foreach="conditionalFormats" t-as="cf" t-key="cf.id">
            <t t-call="${PREVIEW_TEMPLATE}"/>
        </div>
      </div>
      <div class="btn btn-link o-cf-add" t-on-click.prevent.stop="addConditionalFormat">
        <t t-esc="'+ ' + env._t('${conditionalFormattingTerms.newRule}')"/>
      </div>
    </t>
    <t t-if="state.mode === 'edit' || state.mode === 'add'" t-key="state.currentCF.id">
        <div class="o-cf-ruleEditor">
            <div class="o-section o-cf-range">
              <div class="o-section-title">Apply to range</div>
              <div class="o-selection-cf">
                <SelectionInput ranges="state.currentCF.ranges" class="o-range" t-on-selection-changed="onRangesChanged"/>
              </div>
              <div class="o-section-title" t-esc="env._t('${conditionalFormattingTerms.CF_TITLE}')"></div>
              <div class="o_field_radio o_horizontal o_field_widget o-cf-type-selector">
                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="changeRuleType('CellIsRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.currentCFType === 'CellIsRule'}}" type="radio" id="cellIsRule" name="ruleType" value="CellIsRule"/>
                  <label for="cellIsRule" class="custom-control-label o_form_label">
                    <t t-esc="env._t('${conditionalFormattingTerms.SingleColor}')"/>
                  </label>
                </div>
                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="changeRuleType('ColorScaleRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.currentCFType === 'ColorScaleRule'}}" type="radio" id="colorScaleRule" name="ruleType" value="ColorScaleRule"/>
                  <label for="colorScaleRule" class="custom-control-label o_form_label">
                  <t t-esc="env._t('${conditionalFormattingTerms.ColorScale}')"/>
                  </label>
                </div>

                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="changeRuleType('IconSetRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.currentCFType === 'IconSetRule'}}" type="radio" id="iconSetRule" name="ruleType" value="IconSetRule"/>
                  <label for="iconSetRule" class="custom-control-label o_form_label">
                  <t t-esc="env._t('${conditionalFormattingTerms.IconSet}')"/>
                  </label>
                </div>
              </div>
            </div>
            <div class="o-section o-cf-editor">
              <t t-component="editors[state.currentCFType]"
                 t-ref="editorRef"
                 t-key="state.currentCF.id + state.currentCFType"
                 rule="state.rules[state.currentCFType]"/>
              <div class="o-cf-error" t-if="state.error" t-esc="state.error"/>
              <div class="o-sidePanelButtons">
                <button t-on-click="switchToList" class="o-sidePanelButton o-cf-cancel" t-esc="env._t('${conditionalFormattingTerms.CANCEL}')"></button>
                <button t-on-click="saveConditionalFormat" class="o-sidePanelButton o-cf-save" t-esc="env._t('${conditionalFormattingTerms.SAVE}')"></button>
              </div>
            </div>
        </div>
    </t>
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
  selection: Zone[] | undefined;
}

type CFType = "CellIsRule" | "ColorScaleRule" | "IconSetRule";
type CFEditor = CellIsRuleEditor | ColorScaleRuleEditor | IconSetRuleEditor;
type Mode = "list" | "add" | "edit";

interface State {
  mode: Mode;
  rules: Partial<Record<CFType, ConditionalFormatRule | undefined>>;
  currentCF?: Omit<ConditionalFormat, "rule">;
  currentCFType?: CFType;
  error?: string;
}

export class ConditionalFormattingPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  icons = ICONS;
  trashIcon = TRASH;
  static components = { CellIsRuleEditor, ColorScaleRuleEditor, IconSetRuleEditor, SelectionInput };

  //@ts-ignore --> used in XML template
  private cellIsOperators = cellIsOperators;
  private editor = useRef("editorRef");
  private getters = this.env.getters;

  private state: State = useState({
    mode: "list",
    rules: {},
  });

  editors = {
    CellIsRule: CellIsRuleEditor,
    ColorScaleRule: ColorScaleRuleEditor,
    IconSetRule: IconSetRuleEditor,
  };

  constructor(parent: any, props: Props) {
    super(parent, props);
    const sheetId = this.getters.getActiveSheetId();
    const rules = this.getters.getRulesSelection(sheetId, props.selection || []);
    if (rules.length === 1) {
      const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
      if (cf) {
        this.editConditionalFormat(cf);
      }
    }
  }

  get conditionalFormats(): ConditionalFormat[] {
    return this.getters.getConditionalFormats(this.getters.getActiveSheetId());
  }

  async willUpdateProps(nextProps: Props) {
    if (nextProps.selection !== this.props.selection) {
      const sheetId = this.getters.getActiveSheetId();
      const rules = this.getters.getRulesSelection(sheetId, nextProps.selection || []);
      if (rules.length === 1) {
        const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
        if (cf) {
          this.editConditionalFormat(cf);
        }
      } else {
        this.switchToList();
      }
    }
  }

  /**
   * Switch to the list view
   */
  private switchToList() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
    this.state.currentCFType = undefined;
    this.state.error = undefined;
    this.state.rules = {};
  }

  getStyle(rule: SingleColorRules | ColorScaleRule): string {
    if (rule.type === "CellIsRule") {
      const fontWeight = rule.style.bold ? "bold" : "normal";
      const fontDecoration = rule.style.strikethrough ? "line-through" : "none";
      const fontStyle = rule.style.italic ? "italic" : "normal";
      const color = rule.style.textColor || "none";
      const backgroundColor = rule.style.fillColor || "none";
      return `font-weight:${fontWeight};
               text-decoration:${fontDecoration};
               font-style:${fontStyle};
               color:${color};
               background-color:${backgroundColor};`;
    } else if (rule.type === "ColorScaleRule") {
      const minColor = colorNumberString(rule.minimum.color);
      const midColor = rule.midpoint ? colorNumberString(rule.midpoint.color) : null;
      const maxColor = colorNumberString(rule.maximum.color);
      const baseString = "background-image: linear-gradient(to right, #";
      return midColor
        ? baseString + minColor + ", #" + midColor + ", #" + maxColor + ")"
        : baseString + minColor + ", #" + maxColor + ")";
    }
    return "";
  }

  getDescription(cf: ConditionalFormat): string {
    //TODO Fix translations of this
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

  saveConditionalFormat() {
    if (this.state.currentCF) {
      const invalidRanges = this.state.currentCF.ranges.some((xc) => !xc.match(rangeReference));
      if (invalidRanges) {
        this.state.error = this.env._t(
          conditionalFormattingTerms.Errors[CommandResult.InvalidRange]
        );
        return;
      }
      const result = this.env.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: this.getEditorRule(),
          id:
            this.state.mode === "edit" ? this.state.currentCF.id : this.env.uuidGenerator.uuidv4(),
        },
        target: this.state.currentCF.ranges.map(toZone),
        sheetId: this.getters.getActiveSheetId(),
      });
      if (result !== CommandResult.Success) {
        this.state.error = this.env._t(
          conditionalFormattingTerms.Errors[result] || conditionalFormattingTerms.Errors.unexpected
        );
      } else {
        this.switchToList();
      }
    }
  }

  /**
   * Get the rule currently edited with the editor
   */
  private getEditorRule(): ConditionalFormatRule {
    return (<CFEditor>this.editor.comp).getRule();
  }

  /**
   * Create a new CF, a CellIsRule by default
   */
  addConditionalFormat() {
    this.state.mode = "add";
    this.state.currentCFType = "CellIsRule";
    this.state.rules["CellIsRule"] = CellIsRuleEditor.getDefaultRule();
    this.state.currentCF = {
      id: this.env.uuidGenerator.uuidv4(),
      ranges: this.getters
        .getSelectedZones()
        .map((zone) => this.getters.zoneToXC(this.getters.getActiveSheetId(), zone)),
    };
  }

  /**
   * Delete a CF
   */
  deleteConditionalFormat(cf: ConditionalFormat) {
    this.env.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: cf.id,
      sheetId: this.getters.getActiveSheetId(),
    });
  }

  /**
   * Edit an existing CF
   */
  editConditionalFormat(cf: ConditionalFormat) {
    this.state.mode = "edit";
    this.state.currentCF = cf;
    this.state.currentCFType =
      cf.rule.type === "CellIsRule"
        ? "CellIsRule"
        : cf.rule.type === "ColorScaleRule"
        ? "ColorScaleRule"
        : "IconSetRule";
    this.state.rules[cf.rule.type] = cf.rule;
  }

  changeRuleType(ruleType: CFType) {
    if (this.state.currentCFType === ruleType) {
      return;
    }
    if (this.state.currentCFType) {
      this.state.rules[this.state.currentCFType] = this.getEditorRule();
    }
    this.state.currentCFType = ruleType;
    if (!(ruleType in this.state.rules)) {
      switch (ruleType) {
        case "CellIsRule":
          this.state.rules["CellIsRule"] = CellIsRuleEditor.getDefaultRule();
          break;
        case "ColorScaleRule":
          this.state.rules["ColorScaleRule"] = ColorScaleRuleEditor.getDefaultRule();
          break;
        case "IconSetRule":
          this.state.rules["IconSetRule"] = IconSetRuleEditor.getDefaultRule();
          break;
      }
    }
  }

  onRangesChanged({ detail }: { detail: { ranges: string[] } }) {
    if (this.state.currentCF) {
      this.state.currentCF.ranges = detail.ranges;
    }
  }
}
