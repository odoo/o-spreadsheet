import { ComponentConstructor, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "../../../../constants";
import { colorNumberToHex, colorToNumber, isColorValid, rangeReference } from "../../../../helpers";
import { canonicalizeCFRule } from "../../../../helpers/locale";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores";
import {
  availableConditionalFormatOperators,
  CancelledReason,
  CellIsRule,
  Color,
  ColorScaleRule,
  Command,
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
} from "../../../../types";
import { hexaToInt } from "../../../../xlsx/conversion";
import { ICON_SETS, ICONS } from "../../../icons/icons";
import { CfTerms } from "../../../translations_terms";

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

export class ConditionalFormattingEditorStore extends SpreadsheetStore {
  mutators = ["updateConditionalFormat", "closeMenus"] as const;

  icons = ICONS;
  iconSets = ICON_SETS;

  state: State;
  isUndoRequested: boolean = false;
  private cfId: UID;
  private activeSheetId: UID;

  constructor(get: Get, cf: ConditionalFormat, isNewCf: boolean) {
    super(get);
    this.activeSheetId = this.model.getters.getActiveSheetId();
    this.cfId = cf.id;
    this.state = useState<State>({
      errors: [],
      currentCFType: cf.rule.type,
      ranges: cf.ranges,
      rules: this.getDefaultRules(),
      hasEditedCf: isNewCf,
    });
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
      case "DataBarRule":
        this.state.rules.dataBar = cf.rule;
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REQUEST_UNDO":
        this.isUndoRequested = true;
        break;
    }
  }

  updateConditionalFormat(newCf: Partial<ConditionalFormat> & { suppressErrors?: boolean }) {
    const ranges = newCf.ranges || this.state.ranges;
    const invalidRanges = this.state.ranges.some((xc) => !xc.match(rangeReference));
    if (invalidRanges) {
      if (!newCf.suppressErrors) {
        this.state.errors = [CommandResult.InvalidRange];
      }
      return;
    }
    const locale = this.model.getters.getLocale();
    const rule = newCf.rule || this.getEditedRule(this.state.currentCFType);
    const result = this.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: this.cfId,
        rule: canonicalizeCFRule(rule, locale),
      },
      ranges: ranges.map((xc) => this.model.getters.getRangeDataFromXc(this.activeSheetId, xc)),
      sheetId: this.activeSheetId,
    });
    if (result.isSuccessful) {
      this.state.hasEditedCf = true;
    }
    const reasons = result.reasons.filter((r) => r !== CommandResult.NoChanges);
    if (!newCf.suppressErrors) {
      this.state.errors = reasons;
    }
  }

  get isRangeValid(): boolean {
    return this.state.errors.includes(CommandResult.EmptyRange);
  }

  get errorMessages(): string[] {
    return this.state.errors.map((error) => CfTerms.Errors[error] || CfTerms.Errors.Unexpected);
  }

  onRangeUpdate(ranges: string[]) {
    this.state.ranges = ranges;
  }

  onRangeConfirmed() {
    this.updateConditionalFormat({ ranges: this.state.ranges });
  }

  changeRuleType(ruleType: CFType) {
    if (this.state.currentCFType === ruleType) {
      return;
    }
    this.state.errors = [];
    this.state.currentCFType = ruleType;
    this.updateConditionalFormat({ rule: this.getEditedRule(ruleType), suppressErrors: true });
  }

  private getEditedRule(ruleType: CFType): ConditionalFormatRule {
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

  /*****************************************************************************
   * Cell Is Rule
   ****************************************************************************/

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

  toggleStyle(tool: string) {
    const style = this.state.rules.cellIs.style;
    style[tool] = !style[tool];
    this.updateConditionalFormat({ rule: this.state.rules.cellIs });
    this.closeMenus();
  }

  setColor(target: string, color: Color) {
    this.state.rules.cellIs.style[target] = color;
    this.updateConditionalFormat({ rule: this.state.rules.cellIs });
    this.closeMenus();
  }

  private editOperator(operator: ConditionalFormattingOperatorValues) {
    this.state.rules.cellIs.operator = operator;
    this.updateConditionalFormat({ rule: this.state.rules.cellIs, suppressErrors: true });
    this.closeMenus();
  }

  /*****************************************************************************
   * Color Scale Rule
   ****************************************************************************/

  get previewGradient() {
    const rule = this.state.rules.colorScale;
    const minColor = colorNumberToHex(rule.minimum.color);
    const midColor = colorNumberToHex(rule.midpoint?.color || DEFAULT_COLOR_SCALE_MIDPOINT_COLOR);
    const maxColor = colorNumberToHex(rule.maximum.color);
    const baseString = "background-image: linear-gradient(to right, ";
    return rule.midpoint === undefined
      ? baseString + minColor + ", " + maxColor + ")"
      : baseString + minColor + ", " + midColor + ", " + maxColor + ")";
  }

  onMidpointChange(type) {
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

  /*****************************************************************************
   * Icon Set
   ****************************************************************************/

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
    type: IconThreshold["type"]
  ) {
    this.state.rules.iconSet[inflectionPoint].type = type;
    this.updateConditionalFormat({ rule: this.state.rules.iconSet, suppressErrors: true });
  }

  /*****************************************************************************
   * DataBar
   ****************************************************************************/

  get rangeValues(): string[] {
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

  closeMenus() {
    this.state.openedMenu = undefined;
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
}
