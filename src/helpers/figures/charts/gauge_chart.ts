import {
  BasePlugin,
  CoreGetters,
  RangeAdapterFunctions,
  rangeReference,
  Validation,
  Validator,
} from "@odoo/o-spreadsheet-engine";
import {
  DEFAULT_GAUGE_LOWER_COLOR,
  DEFAULT_GAUGE_MIDDLE_COLOR,
  DEFAULT_GAUGE_UPPER_COLOR,
} from "@odoo/o-spreadsheet-engine/constants";
import {
  isMultipleElementMatrix,
  toScalar,
} from "@odoo/o-spreadsheet-engine/functions/helper_matrices";
import { tryToNumber } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  adaptChartRange,
  duplicateLabelRangeInDuplicatedSheet,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { adaptStringRange } from "@odoo/o-spreadsheet-engine/helpers/formulas";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { ChartCreationContext } from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  GaugeChartDefinition,
  GaugeChartRuntime,
  GaugeInflectionValue,
  SectionRule,
  SectionThreshold,
} from "@odoo/o-spreadsheet-engine/types/chart/gauge_chart";
import { CellErrorType } from "@odoo/o-spreadsheet-engine/types/errors";
import {
  CellValueType,
  Color,
  CommandResult,
  Format,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import { clip, formatOrHumanizeValue, humanizeNumber } from "../../index";

type RangeLimitsValidation = (rangeLimit: string, rangeLimitName: string) => CommandResult;
type InflectionPointValueValidation = (
  inflectionPointValue: string,
  inflectionPointName: string
) => CommandResult;

function isDataRangeValid(definition: GaugeChartDefinition): CommandResult {
  return definition.dataRange && !rangeReference.test(definition.dataRange)
    ? CommandResult.InvalidGaugeDataRange
    : CommandResult.Success;
}

function checkRangeLimits(
  check: RangeLimitsValidation,
  batchValidations: BasePlugin["batchValidations"]
): Validation<GaugeChartDefinition> {
  return batchValidations(
    (definition) => {
      if (definition.sectionRule) {
        return check(definition.sectionRule.rangeMin, "rangeMin");
      }
      return CommandResult.Success;
    },
    (definition) => {
      if (definition.sectionRule) {
        return check(definition.sectionRule.rangeMax, "rangeMax");
      }
      return CommandResult.Success;
    }
  );
}

function checkInflectionPointsValue(
  check: InflectionPointValueValidation,
  batchValidations: BasePlugin["batchValidations"]
): Validation<GaugeChartDefinition> {
  return batchValidations(
    (definition) => {
      if (definition.sectionRule) {
        return check(
          definition.sectionRule.lowerInflectionPoint.value,
          "lowerInflectionPointValue"
        );
      }
      return CommandResult.Success;
    },
    (definition) => {
      if (definition.sectionRule) {
        return check(
          definition.sectionRule.upperInflectionPoint.value,
          "upperInflectionPointValue"
        );
      }
      return CommandResult.Success;
    }
  );
}

function checkEmpty(value: string, valueName: string) {
  if (value === "") {
    switch (valueName) {
      case "rangeMin":
        return CommandResult.EmptyGaugeRangeMin;
      case "rangeMax":
        return CommandResult.EmptyGaugeRangeMax;
    }
  }
  return CommandResult.Success;
}

function checkValueIsNumberOrFormula(value: string, valueName: string) {
  if (value.startsWith("=")) {
    return CommandResult.Success;
  }
  if (isNaN(value as any)) {
    switch (valueName) {
      case "rangeMin":
        return CommandResult.GaugeRangeMinNaN;
      case "rangeMax":
        return CommandResult.GaugeRangeMaxNaN;
      case "lowerInflectionPointValue":
        return CommandResult.GaugeLowerInflectionPointNaN;
      case "upperInflectionPointValue":
        return CommandResult.GaugeUpperInflectionPointNaN;
    }
  }
  return CommandResult.Success;
}

export class GaugeChart extends AbstractChart {
  readonly dataRange?: Range;
  readonly sectionRule: SectionRule;
  readonly background?: Color;
  readonly type = "gauge";

  static allowedDefinitionKeys: readonly (keyof GaugeChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataRange",
    "sectionRule",
  ] as const;

  constructor(definition: GaugeChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataRange = createValidRange(this.getters, this.sheetId, definition.dataRange);
    this.sectionRule = definition.sectionRule;
    this.background = definition.background;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: GaugeChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(
      definition,
      isDataRangeValid,
      validator.chainValidations(
        checkRangeLimits(checkEmpty, validator.batchValidations),
        checkRangeLimits(checkValueIsNumberOrFormula, validator.batchValidations)
      ),
      validator.chainValidations(
        checkInflectionPointsValue(checkValueIsNumberOrFormula, validator.batchValidations)
      )
    );
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: GaugeChartDefinition,
    applyChange: RangeAdapter
  ): GaugeChartDefinition {
    let dataRange: string | undefined;
    if (definition.dataRange) {
      const { changeType, range: adaptedRange } = adaptStringRange(
        chartSheetId,
        definition.dataRange,
        applyChange
      );
      if (changeType !== "REMOVE") {
        dataRange = adaptedRange;
      }
    }
    return {
      ...definition,
      dataRange,
    };
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): GaugeChartDefinition {
    return {
      background: context.background,
      title: context.title || { text: "" },
      type: "gauge",
      dataRange: context.range?.[0]?.dataRange,
      sectionRule: {
        colors: {
          lowerColor: DEFAULT_GAUGE_LOWER_COLOR,
          middleColor: DEFAULT_GAUGE_MIDDLE_COLOR,
          upperColor: DEFAULT_GAUGE_UPPER_COLOR,
        },
        rangeMin: "0",
        rangeMax: "100",
        lowerInflectionPoint: {
          type: "percentage",
          value: "15",
          operator: "<=",
        },
        upperInflectionPoint: {
          type: "percentage",
          value: "40",
          operator: "<=",
        },
      },
      humanize: context.humanize,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): GaugeChart {
    const dataRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.dataRange
    );

    const adaptFormula = (formula: string) =>
      this.getters.copyFormulaStringForSheet(this.sheetId, newSheetId, formula, "moveReference");

    const sectionRule = adaptSectionRuleFormulas(this.sectionRule, adaptFormula);

    const definition = this.getDefinitionWithSpecificRanges(dataRange, sectionRule, newSheetId);
    return new GaugeChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GaugeChart {
    const adaptFormula = (formula: string) =>
      this.getters.copyFormulaStringForSheet(this.sheetId, sheetId, formula, "keepSameReference");

    const sectionRule = adaptSectionRuleFormulas(this.sectionRule, adaptFormula);
    const definition = this.getDefinitionWithSpecificRanges(this.dataRange, sectionRule, sheetId);
    return new GaugeChart(definition, sheetId, this.getters);
  }

  getDefinition(): GaugeChartDefinition {
    return this.getDefinitionWithSpecificRanges(this.dataRange, this.sectionRule);
  }

  private getDefinitionWithSpecificRanges(
    dataRange: Range | undefined,
    sectionRule: SectionRule,
    targetSheetId?: UID
  ): GaugeChartDefinition {
    return {
      background: this.background,
      sectionRule: sectionRule,
      title: this.title,
      type: "gauge",
      dataRange: dataRange
        ? this.getters.getRangeString(dataRange, targetSheetId || this.sheetId)
        : undefined,
      humanize: this.humanize,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      range: definition.dataRange ? [{ dataRange: definition.dataRange }] : undefined,
    };
  }

  updateRanges({ applyChange, adaptFormulaString }: RangeAdapterFunctions): GaugeChart {
    const dataRange = adaptChartRange(this.dataRange, applyChange);

    const adaptFormula = (formula: string) => adaptFormulaString(this.sheetId, formula);
    const sectionRule = adaptSectionRuleFormulas(this.sectionRule, adaptFormula);
    const definition = this.getDefinitionWithSpecificRanges(dataRange, sectionRule);
    return new GaugeChart(definition, this.sheetId, this.getters);
  }
}

export function createGaugeChartRuntime(getters: Getters, chart: GaugeChart): GaugeChartRuntime {
  const locale = getters.getLocale();
  const chartColors = chart.sectionRule.colors;

  let gaugeValue: number | undefined = undefined;
  let formattedValue: string | undefined = undefined;
  let format: Format | undefined = undefined;

  const dataRange = chart.dataRange;
  if (dataRange !== undefined) {
    const cell = getters.getEvaluatedCell({
      sheetId: dataRange.sheetId,
      col: dataRange.zone.left,
      row: dataRange.zone.top,
    });
    if (cell.type === CellValueType.number) {
      gaugeValue = cell.value;
      formattedValue = cell.formattedValue;
      format = cell.format;
    }
  }

  let minValue = getFormulaNumberValue(chart.sheetId, chart.sectionRule.rangeMin, getters);
  let maxValue = getFormulaNumberValue(chart.sheetId, chart.sectionRule.rangeMax, getters);
  if (minValue === undefined || maxValue === undefined) {
    return getInvalidGaugeRuntime(chart, getters);
  }
  if (maxValue < minValue) {
    [minValue, maxValue] = [maxValue, minValue];
  }

  const lowerPoint = chart.sectionRule.lowerInflectionPoint;
  const upperPoint = chart.sectionRule.upperInflectionPoint;
  const lowerPointValue = getSectionThresholdValue(
    chart.sheetId,
    chart.sectionRule.lowerInflectionPoint,
    minValue,
    maxValue,
    getters
  );
  const upperPointValue = getSectionThresholdValue(
    chart.sheetId,
    chart.sectionRule.upperInflectionPoint,
    minValue,
    maxValue,
    getters
  );

  const inflectionValues: GaugeInflectionValue[] = [];
  const colors: Color[] = [];

  if (lowerPointValue !== undefined) {
    inflectionValues.push({
      value: lowerPointValue,
      label: formatOrHumanizeValue(lowerPointValue, format, locale, chart.humanize),
      operator: lowerPoint.operator,
    });
    colors.push(chartColors.lowerColor);
  }

  if (upperPointValue !== undefined && upperPointValue !== lowerPointValue) {
    inflectionValues.push({
      value: upperPointValue,
      label: formatOrHumanizeValue(upperPointValue, format, locale, chart.humanize),
      operator: upperPoint.operator,
    });
    colors.push(chartColors.middleColor);
  }

  if (
    upperPointValue !== undefined &&
    lowerPointValue !== undefined &&
    lowerPointValue > upperPointValue
  ) {
    inflectionValues.reverse();
    colors.reverse();
  }

  colors.push(chartColors.upperColor);

  return {
    background: getters.getStyleOfSingleCellChart(chart.background, dataRange).background,
    title: {
      ...chart.title,
      text: chart.title.text ? getters.dynamicTranslate(chart.title.text) : "",
    },
    minValue: {
      value: minValue,
      label: formatOrHumanizeValue(minValue, format, locale, chart.humanize),
    },
    maxValue: {
      value: maxValue,
      label: formatOrHumanizeValue(maxValue, format, locale, chart.humanize),
    },
    gaugeValue:
      gaugeValue !== undefined && formattedValue
        ? {
            value: gaugeValue,
            label: chart.humanize
              ? humanizeNumber({ value: gaugeValue, format }, locale)
              : formattedValue,
          }
        : undefined,
    inflectionValues,
    colors,
  };
}

function getSectionThresholdValue(
  sheetId: UID,
  threshold: SectionThreshold,
  minValue: number,
  maxValue: number,
  getters: Getters
): number | undefined {
  const numberValue = getFormulaNumberValue(sheetId, threshold.value, getters);
  if (numberValue === undefined) {
    return undefined;
  }
  const value =
    threshold.type === "number"
      ? numberValue
      : minValue + ((maxValue - minValue) * numberValue) / 100;
  return clip(value, minValue, maxValue);
}

function getFormulaNumberValue(sheetId: UID, formula: string, getters: Getters) {
  const value = getters.evaluateFormula(sheetId, formula);
  return isMultipleElementMatrix(value)
    ? undefined
    : tryToNumber(toScalar(value), getters.getLocale());
}

function getInvalidGaugeRuntime(chart: GaugeChart, getters: Getters): GaugeChartRuntime {
  return {
    background: getters.getStyleOfSingleCellChart(chart.background, chart.dataRange).background,
    title: chart.title ?? { text: "" },
    minValue: { value: 0, label: "" },
    maxValue: { value: 100, label: "" },
    gaugeValue: { value: 0, label: CellErrorType.GenericError },
    inflectionValues: [],
    colors: [],
  };
}

function adaptSectionRuleFormulas(
  sectionRule: SectionRule,
  adaptCallback: (formula: string) => string
) {
  return {
    ...sectionRule,
    rangeMin: adaptCallback(sectionRule.rangeMin),
    rangeMax: adaptCallback(sectionRule.rangeMax),
    lowerInflectionPoint: {
      ...sectionRule.lowerInflectionPoint,
      value: adaptCallback(sectionRule.lowerInflectionPoint.value),
    },
    upperInflectionPoint: {
      ...sectionRule.upperInflectionPoint,
      value: adaptCallback(sectionRule.upperInflectionPoint.value),
    },
  };
}
