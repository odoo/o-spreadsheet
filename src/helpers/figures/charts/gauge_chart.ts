import { transformZone } from "../../../collaborative/ot/ot_helpers";
import {
  DEFAULT_GAUGE_LOWER_COLOR,
  DEFAULT_GAUGE_MIDDLE_COLOR,
  DEFAULT_GAUGE_UPPER_COLOR,
} from "../../../constants";
import { BasePlugin } from "../../../plugins/base_plugin";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CellValueType,
  Color,
  CommandResult,
  CoreGetters,
  Format,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
  Validation,
} from "../../../types";
import { ChartCreationContext } from "../../../types/chart/chart";
import {
  GaugeChartDefinition,
  GaugeChartRuntime,
  GaugeValue,
  SectionRule,
  SectionThreshold,
} from "../../../types/chart/gauge_chart";
import { Validator } from "../../../types/validator";
import { clip, formatValue } from "../../index";
import { createRange } from "../../range";
import { rangeReference } from "../../references";
import { toUnboundedZone, zoneToXc } from "../../zones";
import { AbstractChart } from "./abstract_chart";
import { adaptChartRange, copyLabelRangeWithNewSheetId } from "./chart_common";

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

function checkRangeMinBiggerThanRangeMax(definition: GaugeChartDefinition): CommandResult {
  if (definition.sectionRule) {
    if (Number(definition.sectionRule.rangeMin) >= Number(definition.sectionRule.rangeMax)) {
      return CommandResult.GaugeRangeMinBiggerThanRangeMax;
    }
  }
  return CommandResult.Success;
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

function checkNaN(value: string, valueName: string) {
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

  constructor(definition: GaugeChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataRange = createRange(this.getters, this.sheetId, definition.dataRange);
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
        checkRangeLimits(checkNaN, validator.batchValidations),
        checkRangeMinBiggerThanRangeMax
      ),
      validator.chainValidations(checkInflectionPointsValue(checkNaN, validator.batchValidations))
    );
  }

  static transformDefinition(
    definition: GaugeChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): GaugeChartDefinition {
    let dataRangeZone: UnboundedZone | undefined;
    if (definition.dataRange) {
      dataRangeZone = transformZone(toUnboundedZone(definition.dataRange), executed);
    }

    return {
      ...definition,
      dataRange: dataRangeZone ? zoneToXc(dataRangeZone) : undefined,
    };
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): GaugeChartDefinition {
    return {
      background: context.background,
      title: context.title || { text: "" },
      type: "gauge",
      dataRange: context.range ? context.range[0].dataRange : undefined,
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
        },
        upperInflectionPoint: {
          type: "percentage",
          value: "40",
        },
      },
    };
  }

  copyForSheetId(sheetId: UID): GaugeChart {
    const dataRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.dataRange);
    const definition = this.getDefinitionWithSpecificRanges(dataRange, sheetId);
    return new GaugeChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GaugeChart {
    const definition = this.getDefinitionWithSpecificRanges(this.dataRange, sheetId);
    return new GaugeChart(definition, sheetId, this.getters);
  }

  getDefinition(): GaugeChartDefinition {
    return this.getDefinitionWithSpecificRanges(this.dataRange);
  }

  private getDefinitionWithSpecificRanges(
    dataRange: Range | undefined,
    targetSheetId?: UID
  ): GaugeChartDefinition {
    return {
      background: this.background,
      sectionRule: this.sectionRule,
      title: this.title,
      type: "gauge",
      dataRange: dataRange
        ? this.getters.getRangeString(dataRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  getContextCreation(): ChartCreationContext {
    return {
      ...this,
      range: this.dataRange
        ? [{ dataRange: this.getters.getRangeString(this.dataRange, this.sheetId) }]
        : undefined,
    };
  }

  updateRanges(applyChange: ApplyRangeChange): GaugeChart {
    const range = adaptChartRange(this.dataRange, applyChange);
    if (this.dataRange === range) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificRanges(range);
    return new GaugeChart(definition, this.sheetId, this.getters);
  }
}

export function createGaugeChartRuntime(chart: GaugeChart, getters: Getters): GaugeChartRuntime {
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

  const minValue = Number(chart.sectionRule.rangeMin);
  const maxValue = Number(chart.sectionRule.rangeMax);
  const lowerPoint = chart.sectionRule.lowerInflectionPoint;
  const upperPoint = chart.sectionRule.upperInflectionPoint;
  const lowerPointValue = getSectionThresholdValue(lowerPoint, minValue, maxValue);
  const upperPointValue = getSectionThresholdValue(upperPoint, minValue, maxValue);

  const inflectionValues: GaugeValue[] = [];
  const colors: Color[] = [];

  if (lowerPointValue !== undefined) {
    inflectionValues.push({
      value: lowerPointValue,
      label: formatValue(lowerPointValue, { locale, format }),
    });
    colors.push(chartColors.lowerColor);
  }

  if (upperPointValue !== undefined && upperPointValue !== lowerPointValue) {
    inflectionValues.push({
      value: upperPointValue,
      label: formatValue(upperPointValue, { locale, format }),
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
    title: chart.title ?? { text: "" },
    minValue: {
      value: minValue,
      label: formatValue(minValue, { locale, format }),
    },
    maxValue: {
      value: maxValue,
      label: formatValue(maxValue, { locale, format }),
    },
    gaugeValue:
      gaugeValue !== undefined && formattedValue
        ? { value: gaugeValue, label: formattedValue }
        : undefined,
    inflectionValues,
    colors,
  };
}

function getSectionThresholdValue(
  threshold: SectionThreshold,
  minValue: number,
  maxValue: number
): number | undefined {
  if (threshold.value === "" || isNaN(Number(threshold.value))) {
    return undefined;
  }
  const numberValue = Number(threshold.value);
  const value =
    threshold.type === "number"
      ? numberValue
      : minValue + ((maxValue - minValue) * numberValue) / 100;
  return clip(value, minValue, maxValue);
}
