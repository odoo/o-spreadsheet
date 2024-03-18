import { Component, useExternalListener, useState } from "@odoo/owl";
import { CancelledReason, CommandResult } from "../../../..";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "../../../../constants";
import { colorNumberString, rangeReference } from "../../../../helpers";
import { canonicalizeCFRule } from "../../../../helpers/locale";
import {
  CellIsRule,
  Color,
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  ConditionalFormatRule,
  IconSetRule,
  SpreadsheetChildEnv,
} from "../../../../types";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { css, getTextDecoration } from "../../../helpers";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { ICONS, ICON_SETS } from "../../../icons/icons";
import { SelectionInput } from "../../../selection_input/selection_input";
import { CellIsOperators, CfTerms } from "../../../translations_terms";
import { ConditionalFormatPreviewList } from "../cf_preview_list/cf_preview_list";

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
    }
    .o-cell-is-value {
      margin-bottom: 5px;
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
  editedCf?: ConditionalFormat;
  onExitEdition: () => void;
}

type CFType = "CellIsRule" | "ColorScaleRule" | "IconSetRule";

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
  currentCF: Omit<ConditionalFormat, "rule">;
  currentCFType: CFType;
  errors: CancelledReason[];
  rules: Rules;
  openedMenu?: CFMenu;
}

export class ConditionalFormattingEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingEditor";
  static components = {
    SelectionInput,
    IconPicker,
    ColorPickerWidget,
    ConditionalFormatPreviewList,
  };

  icons = ICONS;
  cellIsOperators = CellIsOperators;
  iconSets = ICON_SETS;
  getTextDecoration = getTextDecoration;
  colorNumberString = colorNumberString;

  private state!: State;

  setup() {
    const cf = this.props.editedCf || {
      id: this.env.model.uuidGenerator.uuidv4(),
      ranges: this.env.model.getters
        .getSelectedZones()
        .map((zone) =>
          this.env.model.getters.zoneToXC(this.env.model.getters.getActiveSheetId(), zone)
        ),
    };

    this.state = useState<State>({
      currentCF: cf,
      currentCFType: this.props.editedCf?.rule.type || "CellIsRule",
      errors: [],
      rules: this.getDefaultRules(),
    });
    if (this.props.editedCf) {
      switch (this.props.editedCf.rule.type) {
        case "CellIsRule":
          this.state.rules.cellIs = this.props.editedCf.rule;
          break;
        case "ColorScaleRule":
          this.state.rules.colorScale = this.props.editedCf.rule;
          break;
        case "IconSetRule":
          this.state.rules.iconSet = this.props.editedCf.rule;
          break;
      }
    }

    useExternalListener(window as any, "click", this.closeMenus);
  }

  get isRangeValid(): boolean {
    return this.state.errors.includes(CommandResult.EmptyRange);
  }

  errorMessage(error: CancelledReason): string {
    return CfTerms.Errors[error] || CfTerms.Errors.Unexpected;
  }

  saveConditionalFormat() {
    if (this.state.currentCF) {
      const invalidRanges = this.state.currentCF.ranges.some((xc) => !xc.match(rangeReference));
      if (invalidRanges) {
        this.state.errors = [CommandResult.InvalidRange];
        return;
      }
      const sheetId = this.env.model.getters.getActiveSheetId();
      const locale = this.env.model.getters.getLocale();
      const result = this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: canonicalizeCFRule(this.getEditorRule(), locale),
          id: this.state.currentCF.id,
        },
        ranges: this.state.currentCF.ranges.map((xc) =>
          this.env.model.getters.getRangeDataFromXc(sheetId, xc)
        ),
        sheetId,
      });
      if (!result.isSuccessful) {
        this.state.errors = result.reasons;
      } else {
        this.props.onExitEdition();
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

  onKeydown(event: KeyboardEvent) {
    if (event.key === "F4") {
      const target = event.target as HTMLInputElement;
      const update = this.env.model.getters.getCycledReference(
        { start: target.selectionStart ?? 0, end: target.selectionEnd ?? 0 },
        target.value
      );

      if (!update) {
        return;
      }
      target.value = update.content;
      target.setSelectionRange(update.selection.start, update.selection.end);
      target.dispatchEvent(new Event("input"));
    }
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

ConditionalFormattingEditor.props = {
  editedCf: { type: Object, optional: true },
  onExitEdition: Function,
};
