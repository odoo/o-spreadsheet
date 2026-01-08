import { ICON_SETS, ICONS } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { CfTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { DEFAULT_COLOR_SCALE_MIDPOINT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { canonicalizeCFRule } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { hexaToInt } from "@odoo/o-spreadsheet-engine/xlsx/conversion";
import { ComponentConstructor, useState } from "@odoo/owl";
import { colorNumberToHex, colorToNumber, isColorValid, rangeReference } from "../../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../../registries/criterion_component_registry";
import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores";
import {
  availableConditionalFormatOperators,
  CancelledReason,
  CellIsRule,
  Color,
  ColorScaleRule,
  CommandResult,
  ConditionalFormat,
  ConditionalFormatRule,
  ConditionalFormattingOperatorValues,
  DataBarRule,
  GenericCriterion,
  GenericDateCriterion,
  IconSetRule,
  IconThreshold,
  ThresholdType,
  UID,
  ValueAndLabel,
} from "../../../../types";
import { cssPropertiesToCss } from "../../../helpers";

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
  private cfId: UID;

  constructor(get: Get, cf: ConditionalFormat, isNewCf: boolean) {
    super(get);
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

  updateConditionalFormat(newCf: Partial<ConditionalFormat> & { suppressErrors?: boolean }) {
    const ranges = newCf.ranges || this.state.ranges;
    const invalidRanges = this.state.ranges.some((xc) => !xc.match(rangeReference));
    if (invalidRanges) {
      if (!newCf.suppressErrors) {
        this.state.errors = [CommandResult.InvalidRange];
      }
      return;
    }
    const sheetId = this.model.getters.getActiveSheetId();
    const locale = this.model.getters.getLocale();
    const rule = newCf.rule || this.getEditedRule(this.state.currentCFType);
    const result = this.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: {
        id: this.cfId,
        rule: canonicalizeCFRule(rule, locale),
      },
      ranges: ranges.map((xc) => this.model.getters.getRangeDataFromXc(sheetId, xc)),
      sheetId,
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

  get cfCriterions(): ValueAndLabel[] {
    return getCriterionValueAndLabels(availableConditionalFormatOperators);
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return criterionComponentRegistry.get(this.state.rules.cellIs.operator).component;
  }

  get genericCriterion(): GenericDateCriterion | GenericCriterion {
    return {
      ...this.state.rules.cellIs,
      type: this.state.rules.cellIs.operator,
    };
  }

  onRuleValuesChanged(criterion: GenericCriterion) {
    const newRule: CellIsRule = {
      ...criterion,
      operator: criterion.type as ConditionalFormattingOperatorValues,
      type: "CellIsRule",
      style: this.state.rules.cellIs.style,
    };
    this.state.rules.cellIs = newRule;
    this.updateConditionalFormat({ rule: newRule });
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

  editOperator(operator: ConditionalFormattingOperatorValues) {
    this.state.rules.cellIs.operator = operator;
    if (operator.includes("date") && !this.state.rules.cellIs.dateValue) {
      this.state.rules.cellIs.dateValue = "exactDate";
    }
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
