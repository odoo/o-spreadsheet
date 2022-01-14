import {
  Component,
  markup,
  onWillUpdateProps,
  useExternalListener,
  useState,
  xml,
} from "@odoo/owl";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "../../../constants";
import { colorNumberString, rangeReference, toZone } from "../../../helpers/index";
import {
  CancelledReason,
  CellIsRule,
  ColorScaleRule,
  ColorScaleThreshold,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatRule,
  IconSetRule,
  SingleColorRules,
  SpreadsheetEnv,
  UID,
  Zone,
} from "../../../types";
import { ColorPicker } from "../../color_picker";
import { css } from "../../helpers/css";
import { getTextDecoration } from "../../helpers/dom_helpers";
import { ICONS, ICON_SETS, REFRESH, TRASH } from "../../icons";
import { IconPicker } from "../../icon_picker";
import { SelectionInput } from "../../selection_input";
import { cellIsOperators, conditionalFormattingTerms, GenericWords } from "../translations_terms";
import { TEMPLATE_CELL_IS_RULE_EDITOR } from "./cell_is_rule_editor";
import { TEMPLATE_COLOR_SCALE_EDITOR } from "./color_scale_rule_editor";
import { TEMPLATE_ICON_SET_EDITOR } from "./icon_set_rule_editor";

// TODO vsc: add ordering of rules
const PREVIEW_TEMPLATE = xml/* xml */ `
<div class="o-cf-preview">
  <t t-if="cf.rule.type==='IconSetRule'">
    <div class="o-cf-preview-icon">
      <t t-out="icons[cf.rule.icons.upper].svg"/>
      <t t-out="icons[cf.rule.icons.middle].svg"/>
      <t t-out="icons[cf.rule.icons.lower].svg"/>
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
    <div class="o-cf-delete-button" t-on-click.stop="(ev) => this.deleteConditionalFormat(cf, ev)" aria-label="Remove rule">
    <t t-out="trashIcon"/>
    </div>
  </div>
</div>`;

const TEMPLATE = xml/* xml */ `
  <div class="o-cf">
    <t t-if="state.mode === 'list'">
      <div class="o-cf-preview-list" >
        <div t-on-click="(ev) => this.editConditionalFormat(cf, ev)" t-foreach="conditionalFormats" t-as="cf" t-key="cf.id">
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
                <SelectionInput
                  ranges="state.currentCF.ranges"
                  class="'o-range'"
                  isInvalid="isRangeValid"
                  onSelectionChanged="(ranges) => this.onRangesChanged(ranges)"
                  required="true"/>
              </div>
              <div class="o-section-title" t-esc="env._t('${conditionalFormattingTerms.CF_TITLE}')"></div>
              <div class="o_field_radio o_horizontal o_field_widget o-cf-type-selector">
                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="() => this.changeRuleType('CellIsRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.currentCFType === 'CellIsRule'}}" type="radio" id="cellIsRule" name="ruleType" value="CellIsRule"/>
                  <label for="cellIsRule" class="custom-control-label o_form_label">
                    <t t-esc="env._t('${conditionalFormattingTerms.SingleColor}')"/>
                  </label>
                </div>
                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="() => this.changeRuleType('ColorScaleRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.currentCFType === 'ColorScaleRule'}}" type="radio" id="colorScaleRule" name="ruleType" value="ColorScaleRule"/>
                  <label for="colorScaleRule" class="custom-control-label o_form_label">
                  <t t-esc="env._t('${conditionalFormattingTerms.ColorScale}')"/>
                  </label>
                </div>

                <div class="custom-control custom-radio o_cf_radio_item" t-on-click="() => this.changeRuleType('IconSetRule')">
                  <input class="custom-control-input o_radio_input" t-attf-checked="{{state.currentCFType === 'IconSetRule'}}" type="radio" id="iconSetRule" name="ruleType" value="IconSetRule"/>
                  <label for="iconSetRule" class="custom-control-label o_form_label">
                  <t t-esc="env._t('${conditionalFormattingTerms.IconSet}')"/>
                  </label>
                </div>
              </div>
            </div>
            <div class="o-section o-cf-editor">
              <t t-if="state.currentCFType === 'CellIsRule'"
                 t-call="${TEMPLATE_CELL_IS_RULE_EDITOR}">
                <t t-set="rule" t-value="state.rules.cellIs"/>
              </t>
              <t t-if="state.currentCFType === 'ColorScaleRule'"
                 t-call="${TEMPLATE_COLOR_SCALE_EDITOR}">
                <t t-set="rule" t-value="state.rules.colorScale"/>
              </t>
              <t t-if="state.currentCFType === 'IconSetRule'"
                 t-call="${TEMPLATE_ICON_SET_EDITOR}">
                <t t-set="rule" t-value="state.rules.iconSet"/>
              </t>
              <div class="o-sidePanelButtons">
                <button t-on-click="switchToList" class="o-sidePanelButton o-cf-cancel" t-esc="env._t('${conditionalFormattingTerms.CANCEL}')"></button>
                <button t-on-click="saveConditionalFormat" class="o-sidePanelButton o-cf-save" t-esc="env._t('${conditionalFormattingTerms.SAVE}')"></button>
              </div>
            </div>
            <div class="o-section">
              <div class="o-cf-error" t-foreach="state.errors || []" t-as="error" t-key="error_index">
                <t t-esc="errorMessage(error)"/>
              </div>
            </div>
        </div>
    </t>
  </div>`;

const CSS = css/* scss */ `
  label {
    vertical-align: middle;
  }
  .o_cf_radio_item {
    margin-right: 10%;
  }
  .radio input:checked {
    color: #e9ecef;
    border-color: #00a09d;
    background-color: #00a09d;
  }
  .o-cf-editor {
    border-bottom: solid;
    border-color: lightgrey;
  }
  .o-cf {
    .o-cf-type-selector {
      *,
      ::after,
      ::before {
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
      .o-cf-preview-icon {
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
        .o-cf-preview-description-values {
          overflow: hidden;
        }
        .o-cf-preview-range {
          text-overflow: ellipsis;
          font-size: 12px;
          overflow: hidden;
        }
      }
      .o-cf-delete {
        color: dimgrey;
        left: 90%;
        top: 39%;
        position: absolute;
      }
    }
    .o-cf-ruleEditor {
      font-size: 12px;
      line-height: 1.5;
      .o-selection-cf {
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
  .o-cf-cell-is-rule {
    .o-cf-preview-line {
      border: 1px solid darkgrey;
      padding: 10px;
    }
    .o-cell-is-operator {
      margin-bottom: 5px;
      width: 96%;
    }
    .o-cell-is-value {
      margin-bottom: 5px;
      width: 96%;
    }
    .o-color-picker {
      pointer-events: all;
    }
  }
  .o-cf-color-scale-editor {
    .o-threshold {
      display: flex;
      flex-direction: horizontal;
      select {
        width: 100%;
      }
      .o-threshold-value {
        margin-left: 2%;
        width: 20%;
        min-width: 0px; // input overflows in Firefox otherwise
      }
      .o-threshold-value:disabled {
        background-color: #edebed;
      }
    }
    .o-cf-preview-gradient {
      border: 1px solid darkgrey;
      padding: 10px;
      border-radius: 4px;
    }
  }
  .o-cf-iconset-rule {
    font-size: 12;
    .o-cf-iconsets {
      display: flex;
      justify-content: space-between;
      .o-cf-iconset {
        border: 1px solid #dadce0;
        border-radius: 4px;
        display: inline-flex;
        padding: 5px 8px;
        width: 25%;
        cursor: pointer;
        justify-content: space-between;
        .o-cf-icon {
          display: inline;
          margin-left: 1%;
          margin-right: 1%;
        }
        svg {
          vertical-align: baseline;
        }
      }
      .o-cf-iconset:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .o-inflection {
      .o-cf-icon-button {
        display: inline-block;
        border: 1px solid #dadce0;
        border-radius: 4px;
        cursor: pointer;
        padding: 1px 2px;
      }
      .o-cf-icon-button:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
      table {
        table-layout: fixed;
        margin-top: 2%;
        display: table;
        text-align: left;
        font-size: 12px;
        line-height: 18px;
        width: 100%;
      }
      th.o-cf-iconset-icons {
        width: 8%;
      }
      th.o-cf-iconset-text {
        width: 28%;
      }
      th.o-cf-iconset-operator {
        width: 14%;
      }
      th.o-cf-iconset-type {
        width: 28%;
      }
      th.o-cf-iconset-value {
        width: 26%;
      }
      input,
      select {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
    }
    .o-cf-iconset-reverse {
      margin-bottom: 2%;
      margin-top: 2%;
      .o-cf-label {
        display: inline-block;
        vertical-align: bottom;
        margin-bottom: 2px;
      }
    }
  }
`;
interface Props {
  selection: Zone[] | undefined;
}

type CFType = "CellIsRule" | "ColorScaleRule" | "IconSetRule";
type Mode = "list" | "add" | "edit";

interface Rules {
  cellIs: CellIsRule;
  colorScale: ColorScaleRule;
  iconSet: IconSetRule;
}

type CFMenu =
  | "cellIsRule-textColor"
  | "cellIsRule-fillColor"
  | "colorScale-minimumColor"
  | "colorScale-midpointColor"
  | "colorScale-maximumColor"
  | "iconSet-lowerIcon"
  | "iconSet-middleIcon"
  | "iconSet-upperIcon";

interface State {
  mode: Mode;
  rules: Rules;
  currentCF?: Omit<ConditionalFormat, "rule">;
  currentCFType?: CFType;
  errors: CancelledReason[];
  openedMenu?: CFMenu;
}

export class ConditionalFormattingPanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { SelectionInput, IconPicker, ColorPicker };

  icons = ICONS;
  iconSets = ICON_SETS;
  reverseIcon = markup(REFRESH);
  trashIcon = markup(TRASH);
  cellIsOperators = cellIsOperators;
  getTextDecoration = getTextDecoration;
  colorNumberString = colorNumberString;

  private getters!: SpreadsheetEnv["getters"];
  private activeSheetId!: UID;
  private state!: State;

  setup() {
    this.getters = this.env.getters;
    this.activeSheetId = this.getters.getActiveSheetId();
    this.state = useState({
      mode: "list",
      errors: [],
      rules: this.getDefaultRules(),
    });
    const sheetId = this.getters.getActiveSheetId();
    const rules = this.getters.getRulesSelection(sheetId, this.props.selection || []);
    if (rules.length === 1) {
      const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
      if (cf) {
        this.editConditionalFormat(cf);
      }
    }
    onWillUpdateProps((nextProps: Props) => {
      const newActiveSheetId = this.getters.getActiveSheetId();
      if (newActiveSheetId !== this.activeSheetId) {
        this.activeSheetId = newActiveSheetId;
        this.switchToList();
      } else if (nextProps.selection !== this.props.selection) {
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
    });
    useExternalListener(window as any, "click", this.closeMenus);
  }

  get conditionalFormats(): ConditionalFormat[] {
    return this.getters.getConditionalFormats(this.getters.getActiveSheetId());
  }

  get isRangeValid(): boolean {
    return this.state.errors.includes(CommandResult.EmptyRange);
  }

  errorMessage(error: CancelledReason): string {
    return this.env._t(
      conditionalFormattingTerms.Errors[error] || conditionalFormattingTerms.Errors.unexpected
    );
  }

  /**
   * Switch to the list view
   */
  private switchToList() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
    this.state.currentCFType = undefined;
    this.state.errors = [];
  }

  getStyle(rule: SingleColorRules | ColorScaleRule): string {
    if (rule.type === "CellIsRule") {
      const fontWeight = rule.style.bold ? "bold" : "normal";
      const fontDecoration = getTextDecoration(rule.style);
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
    switch (cf.rule.type) {
      case "CellIsRule":
        return cellIsOperators[cf.rule.operator];
      case "ColorScaleRule":
        return this.env._t("Color scale");
      case "IconSetRule":
        return this.env._t("Icon Set");
      default:
        return "";
    }
  }

  saveConditionalFormat() {
    if (this.state.currentCF) {
      const invalidRanges = this.state.currentCF.ranges.some((xc) => !xc.match(rangeReference));
      if (invalidRanges) {
        this.state.errors = [CommandResult.InvalidRange];
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
      if (!result.isSuccessful) {
        this.state.errors = result.reasons;
      } else {
        this.switchToList();
      }
    }
  }

  /**
   * Get the rule currently edited with the editor
   */
  private getEditorRule(): ConditionalFormatRule {
    switch (this.state.currentCFType) {
      case "CellIsRule":
        return this.state.rules.cellIs;
      case "ColorScaleRule":
        return this.state.rules.colorScale;
      case "IconSetRule":
        return this.state.rules.iconSet;
    }
    throw new Error(`Invalid cf type: ${this.state.currentCFType}`);
  }

  private getDefaultRules(): Rules {
    return {
      cellIs: {
        type: "CellIsRule",
        operator: "IsNotEmpty",
        values: [],
        style: { fillColor: "#b6d7a8" },
      },
      colorScale: {
        type: "ColorScaleRule",
        minimum: { type: "value", color: 0xffffff },
        midpoint: undefined,
        maximum: { type: "value", color: 0x6aa84f },
      },
      iconSet: {
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
    };
  }

  /**
   * Create a new CF, a CellIsRule by default
   */
  addConditionalFormat() {
    this.state.mode = "add";
    this.state.currentCFType = "CellIsRule";
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
    this.state.currentCFType = cf.rule.type;
    switch (cf.rule.type) {
      case "CellIsRule":
        this.state.rules.cellIs = cf.rule;
        break;
      case "ColorScaleRule":
        this.state.rules.colorScale = cf.rule;
        break;
      case "IconSetRule":
        this.state.rules.iconSet = cf.rule;
        break;
    }
  }

  changeRuleType(ruleType: CFType) {
    if (this.state.currentCFType === ruleType || !this.state.rules) {
      return;
    }
    this.state.errors = [];
    this.state.currentCFType = ruleType;
  }

  onRangesChanged(ranges: string[]) {
    if (this.state.currentCF) {
      this.state.currentCF.ranges = ranges;
    }
  }

  /*****************************************************************************
   * Common
   ****************************************************************************/

  toggleMenu(menu: CFMenu) {
    const isSelected: boolean = this.state.openedMenu === menu;
    this.closeMenus();
    if (!isSelected) {
      this.state.openedMenu = menu;
    }
  }

  private closeMenus() {
    this.state.openedMenu = undefined;
  }

  /*****************************************************************************
   * Cell Is Rule
   ****************************************************************************/

  get isValue1Invalid(): boolean {
    return !!this.state.errors?.includes(CommandResult.FirstArgMissing);
  }

  get isValue2Invalid(): boolean {
    return !!this.state.errors?.includes(CommandResult.SecondArgMissing);
  }

  toggleStyle(tool: string) {
    const style = this.state.rules.cellIs.style;
    style[tool] = !style[tool];
    this.closeMenus();
  }

  setColor(target: string, color: string) {
    this.state.rules.cellIs.style[target] = color;
    this.closeMenus();
  }

  /*****************************************************************************
   * Color Scale Rule
   ****************************************************************************/

  isValueInvalid(threshold: "minimum" | "midpoint" | "maximum"): boolean {
    switch (threshold) {
      case "minimum":
        return (
          this.state.errors.includes(CommandResult.MinInvalidFormula) ||
          this.state.errors.includes(CommandResult.MinBiggerThanMid) ||
          this.state.errors.includes(CommandResult.MinBiggerThanMax) ||
          this.state.errors.includes(CommandResult.MinNaN)
        );
      case "midpoint":
        return (
          this.state.errors.includes(CommandResult.MidInvalidFormula) ||
          this.state.errors.includes(CommandResult.MidNaN) ||
          this.state.errors.includes(CommandResult.MidBiggerThanMax)
        );
      case "maximum":
        return (
          this.state.errors.includes(CommandResult.MaxInvalidFormula) ||
          this.state.errors.includes(CommandResult.MaxNaN)
        );

      default:
        return false;
    }
  }

  setColorScaleColor(target: string, color: string) {
    const point = this.state.rules.colorScale[target];
    if (point) {
      point.color = Number.parseInt(color.substr(1), 16);
    }
    this.closeMenus();
  }

  getPreviewGradient() {
    const rule = this.state.rules.colorScale;
    const minColor = colorNumberString(rule.minimum.color);
    const midColor = colorNumberString(rule.midpoint?.color || DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
    const maxColor = colorNumberString(rule.maximum.color);
    const baseString = "background-image: linear-gradient(to right, #";
    return rule.midpoint === undefined
      ? baseString + minColor + ", #" + maxColor + ")"
      : baseString + minColor + ", #" + midColor + ", #" + maxColor + ")";
  }

  getThresholdColor(threshold?: ColorScaleThreshold) {
    return threshold
      ? colorNumberString(threshold.color)
      : colorNumberString(DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
  }

  onMidpointChange(ev) {
    const type = ev.target.value;
    const rule = this.state.rules.colorScale;
    if (type === "none") {
      rule.midpoint = undefined;
    } else {
      rule.midpoint = {
        color: DEFAULT_COLOR_SCALE_MIDPOINT_COLOR,
        value: "",
        ...rule.midpoint,
        type,
      };
    }
  }

  /*****************************************************************************
   * Icon Set
   ****************************************************************************/

  isInflectionPointInvalid(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): boolean {
    switch (inflectionPoint) {
      case "lowerInflectionPoint":
        return (
          this.state.errors.includes(CommandResult.ValueLowerInflectionNaN) ||
          this.state.errors.includes(CommandResult.ValueLowerInvalidFormula) ||
          this.state.errors.includes(CommandResult.LowerBiggerThanUpper)
        );
      case "upperInflectionPoint":
        return (
          this.state.errors.includes(CommandResult.ValueUpperInflectionNaN) ||
          this.state.errors.includes(CommandResult.ValueUpperInvalidFormula) ||
          this.state.errors.includes(CommandResult.LowerBiggerThanUpper)
        );
      default:
        return true;
    }
  }

  reverseIcons() {
    const icons = this.state.rules.iconSet.icons;
    const upper = icons.upper;
    icons.upper = icons.lower;
    icons.lower = upper;
  }

  setIconSet(iconSet: "arrows" | "smiley" | "dots") {
    const icons = this.state.rules.iconSet.icons;
    icons.upper = this.iconSets[iconSet].good;
    icons.middle = this.iconSets[iconSet].neutral;
    icons.lower = this.iconSets[iconSet].bad;
  }

  setIcon(target: "upper" | "middle" | "lower", icon: string) {
    this.state.rules.iconSet.icons[target] = icon;
  }
}
