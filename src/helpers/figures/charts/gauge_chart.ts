import { BasePlugin, rangeReference, Validation } from "@odoo/o-spreadsheet-engine";
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
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import {
  GaugeChartDefinition,
  GaugeChartRuntime,
  GaugeInflectionValue,
  SectionRule,
  SectionThreshold,
} from "@odoo/o-spreadsheet-engine/types/chart/gauge_chart";
import { CellErrorType } from "@odoo/o-spreadsheet-engine/types/errors";
import { CellValueType, Color, CommandResult, Format, Getters, Range, UID } from "../../../types";
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

export const GaugeChart: ChartTypeBuilder<"gauge"> = {
  sequence: 50,
  allowedDefinitionKeys: [...AbstractChart.commonKeys, "dataRange", "sectionRule"],

  fromStrDefinition(definition, sheetId, getters) {
    const dataRange = createValidRange(getters, sheetId, definition.dataRange);
    return { ...definition, dataRange };
  },

  toStrDefinition(definition, sheetId, getters) {
    return {
      ...definition,
      dataRange: definition.dataRange
        ? getters.getRangeString(definition.dataRange, sheetId)
        : undefined,
    };
  },

  validateDefinition(validator, definition) {
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
  },

  transformDefinition(definition, chartSheetId, { adaptRangeString, adaptFormulaString }) {
    let dataRange: string | undefined;
    if (definition.dataRange) {
      const { changeType, range: adaptedRange } = adaptRangeString(
        chartSheetId,
        definition.dataRange
      );
      if (changeType !== "REMOVE") {
        dataRange = adaptedRange;
      }
    }
    const adaptFormula = (formula: string) => adaptFormulaString(chartSheetId, formula);
    const sectionRule = adaptSectionRuleFormulas(definition.sectionRule, adaptFormula);
    return {
      ...definition,
      dataRange,
      sectionRule,
    };
  },

  getDefinitionFromContextCreation(context) {
    return {
      background: context.background,
      title: context.title || { text: "" },
      type: "gauge",
      dataRange: context.dataSource?.dataSets?.[0]?.dataRange,
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
  },

  duplicateInDuplicatedSheet(
    definition,
    sheetIdFrom,
    sheetIdTo,
    coreGetters
  ): GaugeChartDefinition<Range> {
    const dataRange = duplicateLabelRangeInDuplicatedSheet(
      sheetIdFrom,
      sheetIdTo,
      definition.dataRange
    );

    const adaptFormula = (formula: string) =>
      coreGetters.copyFormulaStringForSheet(sheetIdFrom, sheetIdTo, formula, "moveReference");
    const sectionRule = adaptSectionRuleFormulas(definition.sectionRule, adaptFormula);
    return { ...definition, dataRange, sectionRule };
  },

  copyInSheetId(definition, sheetIdFrom, sheetIdTo, coreGetters) {
    const adaptFormula = (formula: string) =>
      coreGetters.copyFormulaStringForSheet(sheetIdFrom, sheetIdTo, formula, "keepSameReference");

    const sectionRule = adaptSectionRuleFormulas(definition.sectionRule, adaptFormula);
    return { ...definition, sectionRule };
  },

  getDefinitionForExcel: () => undefined,

  getContextCreation(definition) {
    return {
      ...definition,
      dataSource: {
        dataSets: definition.dataRange ? [{ dataRange: definition.dataRange, dataSetId: "1" }] : [],
      },
    };
  },

  updateRanges(definition, adapterFunctions, sheetId) {
    const { adaptFormulaString } = adapterFunctions;
    const dataRange = adaptChartRange(definition.dataRange, adapterFunctions);

    const adaptFormula = (formula: string) => adaptFormulaString(sheetId, formula);
    const sectionRule = adaptSectionRuleFormulas(definition.sectionRule, adaptFormula);
    return { ...definition, dataRange, sectionRule };
  },

  getRuntime(getters: Getters, definition, dataSource, sheetId): GaugeChartRuntime {
    const locale = getters.getLocale();
    const chartColors = definition.sectionRule.colors;

    let gaugeValue: number | undefined = undefined;
    let formattedValue: string | undefined = undefined;
    let format: Format | undefined = undefined;

    const dataRange = definition.dataRange;
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

    let minValue = getFormulaNumberValue(sheetId, definition.sectionRule.rangeMin, getters);
    let maxValue = getFormulaNumberValue(sheetId, definition.sectionRule.rangeMax, getters);
    if (minValue === undefined || maxValue === undefined) {
      return getInvalidGaugeRuntime(definition, getters);
    }
    if (maxValue < minValue) {
      [minValue, maxValue] = [maxValue, minValue];
    }

    const lowerPoint = definition.sectionRule.lowerInflectionPoint;
    const upperPoint = definition.sectionRule.upperInflectionPoint;
    const lowerPointValue = getSectionThresholdValue(
      sheetId,
      definition.sectionRule.lowerInflectionPoint,
      minValue,
      maxValue,
      getters
    );
    const upperPointValue = getSectionThresholdValue(
      sheetId,
      definition.sectionRule.upperInflectionPoint,
      minValue,
      maxValue,
      getters
    );

    const inflectionValues: GaugeInflectionValue[] = [];
    const colors: Color[] = [];
    const humanize = definition.humanize;
    const title = definition.title;

    if (lowerPointValue !== undefined) {
      inflectionValues.push({
        value: lowerPointValue,
        label: formatOrHumanizeValue(lowerPointValue, format, locale, humanize),
        operator: lowerPoint.operator,
      });
      colors.push(chartColors.lowerColor);
    }

    if (upperPointValue !== undefined && upperPointValue !== lowerPointValue) {
      inflectionValues.push({
        value: upperPointValue,
        label: formatOrHumanizeValue(upperPointValue, format, locale, humanize),
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
      background: getters.getStyleOfSingleCellChart(definition.background, dataRange).background,
      title: {
        ...title,
        text: title.text ? getters.dynamicTranslate(title.text) : "",
      },
      minValue: {
        value: minValue,
        label: formatOrHumanizeValue(minValue, format, locale, humanize),
      },
      maxValue: {
        value: maxValue,
        label: formatOrHumanizeValue(maxValue, format, locale, humanize),
      },
      gaugeValue:
        gaugeValue !== undefined && formattedValue
          ? {
              value: gaugeValue,
              label: humanize
                ? humanizeNumber({ value: gaugeValue, format }, locale)
                : formattedValue,
            }
          : undefined,
      inflectionValues,
      colors,
    };
  },
};

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

function getInvalidGaugeRuntime(
  definition: GaugeChartDefinition<Range>,
  getters: Getters
): GaugeChartRuntime {
  return {
    background: getters.getStyleOfSingleCellChart(definition.background, definition.dataRange)
      .background,
    title: definition.title ?? { text: "" },
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
