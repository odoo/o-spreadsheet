import { Component, onWillUpdateProps, useExternalListener, useState } from "@odoo/owl";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "../../../constants";
import { colorNumberString, rangeReference } from "../../../helpers/index";
import { _t } from "../../../translation";
import {
  CancelledReason,
  CellIsRule,
  Color,
  ColorScaleRule,
  ColorScaleThreshold,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatRule,
  IconSetRule,
  SingleColorRules,
  SpreadsheetChildEnv,
  UID,
  UpDown,
  Zone,
} from "../../../types";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { getTextDecoration } from "../../helpers";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { ICONS, ICON_SETS } from "../../icons/icons";
import { IconPicker } from "../../icon_picker/icon_picker";
import { SelectionInput } from "../../selection_input/selection_input";
import { CellIsOperators } from "../../translations_terms";
import { CfTerms } from "./../../translations_terms";

// TODO vsc: add ordering of rules
css/* scss */ `
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
    .o-section-subtitle:first-child {
      margin-top: 0px;
    }
    .o-cf-cursor-ptr {
      cursor: pointer;
    }
    .o-cf-preview {
      background-color: #fff;
      border-bottom: 1px solid #ccc;
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
        margin-top: 3px;
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
        margin-top: 3px;
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
          text-overflow: ellipsis;
          font-weight: 600;
          color: #303030;
          max-height: 2.8em;
          line-height: 1.4em;
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
      .o-cf-reorder {
        color: gray;
        left: 90%;
        position: absolute;
        height: 100%;
        width: 10%;
      }
      .o-cf-reorder-button:hover {
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0.08);
      }
      .o-cf-reorder-button-up {
        width: 15px;
        height: 20px;
        padding: 5px;
        padding-top: 0px;
      }
      .o-cf-reorder-button-down {
        width: 15px;
        height: 20px;
        bottom: 20px;
        padding: 5px;
        padding-top: 0px;
        position: absolute;
      }
    }
    .o-cf-ruleEditor {
      font-size: 12px;
      line-height: 1.5;
      .o-selection-cf {
        margin-bottom: 3%;
      }
      .o-cell-content {
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 35px;
      }
    }
    .o-cf-btn-link {
      font-size: 14px;
      padding: 20px 24px 11px 24px;
      height: 44px;
      cursor: pointer;
      text-decoration: none;
    }
    .o-cf-btn-link:hover {
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
    .o-color-picker-widget .o-color-picker-button {
      pointer-events: all;
      cursor: default;
    }
  }
  .o-cf-color-scale-editor {
    .o-threshold {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
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
  selection?: Zone[];
  onCloseSidePanel: () => void;
}

type CFType = "CellIsRule" | "ColorScaleRule" | "IconSetRule";
type Mode = "list" | "add" | "edit" | "reorder";

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

export class ConditionalFormattingPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingPanel";
  static components = { SelectionInput, IconPicker, ColorPickerWidget };

  icons = ICONS;
  cellIsOperators = CellIsOperators;
  iconSets = ICON_SETS;
  getTextDecoration = getTextDecoration;
  colorNumberString = colorNumberString;

  private activeSheetId!: UID;
  private state!: State;

  setup() {
    this.activeSheetId = this.env.model.getters.getActiveSheetId();
    this.state = useState({
      mode: "list",
      errors: [],
      rules: this.getDefaultRules(),
    });
    const sheetId = this.env.model.getters.getActiveSheetId();
    const rules = this.env.model.getters.getRulesSelection(sheetId, this.props.selection || []);
    if (rules.length === 1) {
      const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
      if (cf) {
        this.editConditionalFormat(cf);
      }
    }
    onWillUpdateProps((nextProps: Props) => {
      const newActiveSheetId = this.env.model.getters.getActiveSheetId();
      if (newActiveSheetId !== this.activeSheetId) {
        this.activeSheetId = newActiveSheetId;
        this.switchToList();
      } else if (nextProps.selection !== this.props.selection) {
        const sheetId = this.env.model.getters.getActiveSheetId();
        const rules = this.env.model.getters.getRulesSelection(sheetId, nextProps.selection || []);
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
    return this.env.model.getters.getConditionalFormats(this.env.model.getters.getActiveSheetId());
  }

  get isRangeValid(): boolean {
    return this.state.errors.includes(CommandResult.EmptyRange);
  }

  errorMessage(error: CancelledReason): string {
    return CfTerms.Errors[error] || CfTerms.Errors.Unexpected;
  }

  /**
   * Switch to the list view
   */
  private switchToList() {
    this.state.mode = "list";
    this.state.currentCF = undefined;
    this.state.currentCFType = undefined;
    this.state.errors = [];
    this.state.rules = this.getDefaultRules();
  }

  getStyle(rule: SingleColorRules | ColorScaleRule): string {
    if (rule.type === "CellIsRule") {
      return cssPropertiesToCss({
        "font-weight": rule.style.bold ? "bold" : "normal",
        "text-decoration": getTextDecoration(rule.style),
        "font-style": rule.style.italic ? "italic" : "normal",
        color: rule.style.textColor || "none",
        "background-color": rule.style.fillColor || "none",
      });
    } else if (rule.type === "ColorScaleRule") {
      const minColor = colorNumberString(rule.minimum.color);
      const midColor = rule.midpoint ? colorNumberString(rule.midpoint.color) : null;
      const maxColor = colorNumberString(rule.maximum.color);
      const baseString = "background-image: linear-gradient(to right, ";
      return midColor
        ? baseString + minColor + ", " + midColor + ", " + maxColor + ")"
        : baseString + minColor + ", " + maxColor + ")";
    }
    return "";
  }

  getDescription(cf: ConditionalFormat): string {
    switch (cf.rule.type) {
      case "CellIsRule":
        const description = CellIsOperators[cf.rule.operator];
        if (cf.rule.values.length === 1) {
          return `${description} ${cf.rule.values[0]}`;
        }
        if (cf.rule.values.length === 2) {
          return _t("%s %s and %s", description, cf.rule.values[0], cf.rule.values[1]);
        }
        return description;
      case "ColorScaleRule":
        return CfTerms.ColorScale;
      case "IconSetRule":
        return CfTerms.IconSet;
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
      const sheetId = this.env.model.getters.getActiveSheetId();
      const result = this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: this.getEditorRule(),
          id:
            this.state.mode === "edit"
              ? this.state.currentCF.id
              : this.env.model.uuidGenerator.uuidv4(),
        },
        ranges: this.state.currentCF.ranges.map((xc) =>
          this.env.model.getters.getRangeDataFromXc(sheetId, xc)
        ),
        sheetId,
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
      id: this.env.model.uuidGenerator.uuidv4(),
      ranges: this.env.model.getters
        .getSelectedZones()
        .map((zone) =>
          this.env.model.getters.zoneToXC(this.env.model.getters.getActiveSheetId(), zone)
        ),
    };
  }

  /**
   * Delete a CF
   */
  deleteConditionalFormat(cf: ConditionalFormat) {
    this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: cf.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  /**
   * Edit an existing CF. Return without doing anything in reorder mode.
   */
  editConditionalFormat(cf: ConditionalFormat) {
    if (this.state.mode === "reorder") return;

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

  /**
   * Reorder existing CFs
   */
  reorderConditionalFormats() {
    this.state.mode = "reorder";
  }

  reorderRule(cf: ConditionalFormat, direction: UpDown) {
    this.env.model.dispatch("MOVE_CONDITIONAL_FORMAT", {
      cfId: cf.id,
      direction: direction,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
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

  setColor(target: string, color: Color) {
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

  setColorScaleColor(target: string, color: Color) {
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
    const baseString = "background-image: linear-gradient(to right, ";
    return rule.midpoint === undefined
      ? baseString + minColor + ", " + maxColor + ")"
      : baseString + minColor + ", " + midColor + ", " + maxColor + ")";
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

ConditionalFormattingPanel.props = {
  selection: { type: Object, optional: true },
  onCloseSidePanel: Function,
};
