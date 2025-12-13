import { compile } from "@odoo/o-spreadsheet-engine";
import { ICONS, ICON_SETS } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { CfTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { canonicalizeCFRule } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { hexaToInt } from "@odoo/o-spreadsheet-engine/xlsx/conversion";
import { Component, ComponentConstructor, useExternalListener, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { colorNumberToHex, colorToNumber, isColorValid } from "../../../../helpers";
import { cycleFixedReference } from "../../../../helpers/reference_type";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../../registries/criterion_component_registry";
import {
  CancelledReason,
  CellIsRule,
  Color,
  ColorScaleRule,
  ColorScaleThreshold,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatRule,
  ConditionalFormattingOperatorValues,
  DataBarRule,
  GenericCriterion,
  IconSetRule,
  IconThreshold,
  ThresholdType,
  UID,
  availableConditionalFormatOperators,
} from "../../../../types";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { StandaloneComposer } from "../../../composer/standalone_composer/standalone_composer";
import { cssPropertiesToCss, getTextDecoration } from "../../../helpers";
import { adaptFormulaToSheet } from "../../../helpers/formulas";
import { IconPicker } from "../../../icon_picker/icon_picker";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";
import { ConditionalFormatPreviewList } from "../cf_preview_list/cf_preview_list";

interface Props {
  editedCf: ConditionalFormat;
  sheetId: UID;
  onExit: () => void;
  onCancel: () => void;
  isNewCf: boolean;
}

type CFType = "CellIsRule" | "ColorScaleRule" | "IconSetRule" | "DataBarRule";

interface Rules {
  cellIs: CellIsRule;
  colorScale: ColorScaleRule;
  iconSet: IconSetRule;
  dataBar: DataBarRule;
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
  currentCFType: CFType;
  errors: CancelledReason[];
  rules: Rules;
  openedMenu?: CFMenu;
  ranges: string[];
  hasEditedCf: boolean;
}

export class ConditionalFormattingEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingEditor";
  static props = {
    sheetId: String,
    editedCf: Object,
    onCancel: Function,
    onExit: Function,
    isNewCf: Boolean,
  };
  static components = {
    SelectionInput,
    IconPicker,
    ColorPickerWidget,
    ConditionalFormatPreviewList,
    Section,
    RoundColorPicker,
    StandaloneComposer,
    BadgeSelection,
    ValidationMessages,
    SelectMenu,
  };

  icons = ICONS;
  iconSets = ICON_SETS;
  getTextDecoration = getTextDecoration;
  colorNumberToHex = colorNumberToHex;

  private state!: State;

  setup() {
    this.state = useState<State>({
      errors: [],
      currentCFType: this.props.editedCf.rule.type,
      ranges: this.props.editedCf.ranges,
      rules: this.getDefaultRules(),
      hasEditedCf: this.props.isNewCf,
    });
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
      case "DataBarRule":
        this.state.rules.dataBar = this.props.editedCf.rule;
        break;
    }
    useExternalListener(window as any, "click", this.closeMenus);
  }

  get rangeTitle(): string {
    if (this.isRangeReadonly) {
      return _t(
        "Apply to ranges: (on %s)",
        this.env.model.getters.getSheetName(this.props.sheetId)
      );
    }
    return _t("Apply to ranges:");
  }

  get isRangeReadonly(): boolean {
    return this.env.model.getters.getActiveSheetId() !== this.props.sheetId;
  }

  get isRangeValid(): boolean {
    return this.state.errors.includes(CommandResult.EmptyRange);
  }

  get errorMessages(): string[] {
    return this.state.errors.map((error) => this.errorMessage(error));
  }

  get invalidRanges(): string[] {
    return this.state.ranges.filter((xc) => {
      return !this.env.model.getters.isRangeValid(xc);
    });
  }

  get outOfSheetRanges(): string[] {
    const sheetId = this.props.sheetId;
    return this.state.ranges.filter((xc) => {
      const range = this.env.model.getters.getRangeFromSheetXC(sheetId, xc);
      return range.sheetId !== sheetId;
    });
  }

  get invalidFormulas(): string[] {
    return this.state.rules.cellIs.values.filter((formula) => {
      return formula.startsWith("=") && compile(formula || "").isBadExpression;
    });
  }

  errorMessage(reason: CancelledReason): string {
    switch (reason) {
      case CommandResult.TargetOutOfSheet:
        return CfTerms.Errors[reason](
          this.env.model.getters.getSheetName(this.props.sheetId),
          this.outOfSheetRanges
        );
      case CommandResult.InvalidRange:
        return CfTerms.Errors[reason](this.invalidRanges);
      case CommandResult.ValueCellIsInvalidFormula:
        return CfTerms.Errors[reason](this.invalidFormulas);
      default:
        return CfTerms.Errors[reason]?.() || CfTerms.Errors.Unexpected();
    }
  }

  get cfTypesValues() {
    return [
      { value: "CellIsRule", label: _t("Single color") },
      { value: "ColorScaleRule", label: _t("Color scale") },
      { value: "IconSetRule", label: _t("Icon set") },
      { value: "DataBarRule", label: _t("Data bar") },
    ];
  }

  updateConditionalFormat(newCf: Partial<ConditionalFormat> & { suppressErrors?: boolean }) {
    const sheetId = this.props.sheetId;
    const rangesXC = newCf.ranges || this.state.ranges;
    const ranges = rangesXC.map((xc) => this.env.model.getters.getRangeDataFromXc(sheetId, xc));
    const rule = newCf.rule || this.getEditedRule(this.state.currentCFType);
    const result = this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        rule: canonicalizeCFRule(rule, this.env.model.getters.getLocale()),
        id: this.props.editedCf.id,
      },
      ranges,
      sheetId,
    });
    if (result.isSuccessful) {
      this.state.hasEditedCf = true;
    }
    const reasons = result.reasons.filter((r) => r !== CommandResult.NoChanges);
    if (!newCf.suppressErrors) {
      this.state.errors = reasons;
    }
    return reasons;
  }

  getEditedRule(ruleType: CFType): ConditionalFormatRule {
    switch (ruleType) {
      case "CellIsRule":
        return this.state.rules.cellIs;
      case "ColorScaleRule":
        return this.state.rules.colorScale;
      case "IconSetRule":
        return this.state.rules.iconSet;
      case "DataBarRule":
        return this.state.rules.dataBar;
    }
  }

  onSave() {
    const result = this.updateConditionalFormat({});
    if (result.length === 0) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdTo: this.props.sheetId,
        sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      });
      this.props.onExit();
    }
  }

  onCancel() {
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdTo: this.props.sheetId,
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
    });
    if (this.state.hasEditedCf) {
      this.props.onCancel();
    } else {
      this.props.onExit();
    }
  }

  private getDefaultRules(): Rules {
    return {
      cellIs: {
        type: "CellIsRule",
        operator: "isNotEmpty",
        values: [],
        style: { fillColor: "#b6d7a8" },
      },
      colorScale: {
        type: "ColorScaleRule",
        minimum: { type: "value", color: hexaToInt("EFF7FF") },
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
      dataBar: {
        type: "DataBarRule",
        color: 0xd9ead3,
      },
    };
  }

  changeRuleType(ruleType: CFType) {
    if (this.state.currentCFType === ruleType) {
      return;
    }
    this.state.errors = [];
    this.state.currentCFType = ruleType;
    this.updateConditionalFormat({ rule: this.getEditedRule(ruleType), suppressErrors: true });
  }

  onRangeUpdate(ranges: string[]) {
    this.state.ranges = ranges;
  }

  onRangeConfirmed() {
    this.updateConditionalFormat({ ranges: this.state.ranges });
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
    return (
      this.state.errors.includes(CommandResult.FirstArgMissing) ||
      (this.state.errors.includes(CommandResult.ValueCellIsInvalidFormula) &&
        this.invalidFormulas.includes(this.state.rules.cellIs.values[0]))
    );
  }

  get isValue2Invalid(): boolean {
    return (
      this.state.errors.includes(CommandResult.SecondArgMissing) ||
      (this.state.errors.includes(CommandResult.ValueCellIsInvalidFormula) &&
        this.invalidFormulas.includes(this.state.rules.cellIs.values[1]))
    );
  }

  toggleStyle(tool: string) {
    const style = this.state.rules.cellIs.style;
    style[tool] = !style[tool];
    this.updateConditionalFormat({ rule: this.state.rules.cellIs });
    this.closeMenus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === "F4") {
      const target = event.target as HTMLInputElement;
      const update = cycleFixedReference(
        { start: target.selectionStart ?? 0, end: target.selectionEnd ?? 0 },
        target.value,
        this.env.model.getters.getLocale()
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
    this.updateConditionalFormat({ rule: this.state.rules.cellIs });
    this.closeMenus();
  }

  editOperator(operator: ConditionalFormattingOperatorValues) {
    this.state.rules.cellIs.operator = operator;
    this.updateConditionalFormat({ rule: this.state.rules.cellIs, suppressErrors: true });
    this.closeMenus();
  }

  get cfCriterionMenuItems(): Action[] {
    return getCriterionMenuItems(
      (type) => this.editOperator(type as ConditionalFormattingOperatorValues),
      availableConditionalFormatOperators
    );
  }

  get selectedCriterionName(): string {
    return criterionEvaluatorRegistry.get(this.state.rules.cellIs.operator).name;
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return criterionComponentRegistry.get(this.state.rules.cellIs.operator).component;
  }

  get genericCriterion(): GenericCriterion {
    return {
      type: this.state.rules.cellIs.operator,
      values: this.state.rules.cellIs.values,
    };
  }

  onRuleValuesChanged(rule: CellIsRule) {
    this.state.rules.cellIs.values = rule.values;
    this.updateConditionalFormat({ rule: { ...this.state.rules.cellIs, values: rule.values } });
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
    if (!isColorValid(color)) {
      return;
    }

    const point = this.state.rules.colorScale[target];
    if (point) {
      point.color = colorToNumber(color);
    }
    this.updateConditionalFormat({ rule: this.state.rules.colorScale });
    this.closeMenus();
  }

  getColorScalePreviewStyle() {
    const rule = this.state.rules.colorScale;
    const minColor = colorNumberToHex(rule.minimum.color);
    const midColor = colorNumberToHex(rule.midpoint?.color || DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
    const maxColor = colorNumberToHex(rule.maximum.color);
    const baseString = "linear-gradient(to right, ";
    const backgroundImage =
      rule.midpoint === undefined
        ? baseString + minColor + ", " + maxColor + ")"
        : baseString + minColor + ", " + midColor + ", " + maxColor + ")";
    return cssPropertiesToCss({
      "background-image": backgroundImage,
      color: "#000",
    });
  }

  getThresholdColor(threshold?: ColorScaleThreshold) {
    return threshold
      ? colorNumberToHex(threshold.color)
      : colorNumberToHex(DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
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
    this.updateConditionalFormat({ rule, suppressErrors: true });
  }

  updateThresholdType(threshold: "minimum" | "maximum", thresholdType: ThresholdType) {
    this.state.rules.colorScale[threshold].type = thresholdType;
    this.updateConditionalFormat({ rule: this.state.rules.colorScale, suppressErrors: true });
  }

  updateThresholdValue(threshold: "minimum" | "midpoint" | "maximum", value: string) {
    this.state.rules.colorScale[threshold]!.value = value;
    this.updateConditionalFormat({ rule: this.state.rules.colorScale });
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
    this.updateConditionalFormat({ rule: this.state.rules.iconSet });
  }

  setIconSet(iconSet: "arrows" | "smiley" | "dots") {
    const icons = this.state.rules.iconSet.icons;
    icons.upper = this.iconSets[iconSet].good;
    icons.middle = this.iconSets[iconSet].neutral;
    icons.lower = this.iconSets[iconSet].bad;
    this.updateConditionalFormat({ rule: this.state.rules.iconSet });
  }

  setIcon(target: "upper" | "middle" | "lower", icon: string) {
    this.state.rules.iconSet.icons[target] = icon;
    this.updateConditionalFormat({ rule: this.state.rules.iconSet });
  }

  setInflectionOperator(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint",
    operator: "gt" | "ge"
  ) {
    this.state.rules.iconSet[inflectionPoint].operator = operator;
    this.updateConditionalFormat({ rule: this.state.rules.iconSet });
  }

  setInflectionValue(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint",
    value: string
  ) {
    this.state.rules.iconSet[inflectionPoint].value = value;
    this.updateConditionalFormat({ rule: this.state.rules.iconSet });
  }

  setInflectionType(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint",
    type: IconThreshold["type"],
    ev
  ) {
    this.state.rules.iconSet[inflectionPoint].type = type;
    this.updateConditionalFormat({ rule: this.state.rules.iconSet, suppressErrors: true });
  }

  getColorScaleComposerProps(
    thresholdType: "minimum" | "midpoint" | "maximum"
  ): StandaloneComposer["props"] {
    const threshold = this.state.rules.colorScale[thresholdType];
    if (!threshold) {
      throw new Error("Threshold not found");
    }
    const isInvalid = this.isValueInvalid(thresholdType);
    return {
      onConfirm: (str: string) => {
        threshold.value = adaptFormulaToSheet(this.env.model.getters, str, this.props.sheetId);
        this.updateConditionalFormat({ rule: this.state.rules.colorScale });
      },
      composerContent: threshold.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.props.sheetId,
    };
  }

  getColorIconSetComposerProps(
    inflectionPoint: "lowerInflectionPoint" | "upperInflectionPoint"
  ): StandaloneComposer["props"] {
    const inflection = this.state.rules.iconSet[inflectionPoint];
    const isInvalid = this.isInflectionPointInvalid(inflectionPoint);
    return {
      onConfirm: (str: string) => {
        inflection.value = adaptFormulaToSheet(this.env.model.getters, str, this.props.sheetId);
        this.updateConditionalFormat({ rule: this.state.rules.iconSet });
      },
      composerContent: inflection.value || "",
      placeholder: _t("Formula"),
      defaultStatic: true,
      invalid: isInvalid,
      class: "o-sidePanel-composer",
      defaultRangeSheetId: this.props.sheetId,
    };
  }

  /*****************************************************************************
   * DataBar
   ****************************************************************************/

  getRangeValues(): string[] {
    return [this.state.rules.dataBar.rangeValues || ""];
  }

  updateDataBarColor(color: Color) {
    if (!isColorValid(color)) {
      return;
    }

    this.state.rules.dataBar.color = Number.parseInt(color.slice(1), 16);
    this.updateConditionalFormat({ rule: this.state.rules.dataBar });
  }

  onDataBarRangeUpdate(ranges: string[]) {
    this.state.rules.dataBar.rangeValues = ranges[0];
  }

  onDataBarRangeChange() {
    this.updateConditionalFormat({ rule: this.state.rules.dataBar });
  }
}
