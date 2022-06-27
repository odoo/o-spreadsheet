import { transformZone } from "../../collaborative/ot/ot_helpers";
import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartRegistry } from "../../registries/chart_types";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  Zone,
} from "../../types";
import { ChartCreationContext } from "../../types/chart/chart";
import { ScorecardChartDefinition, ScorecardChartRuntime } from "../../types/chart/scorecard_chart";
import { Validator } from "../../types/validator";
import { createRange } from "../range";
import { rangeReference } from "../references";
import { toZone, zoneToXc } from "../zones";
import { AbstractChart } from "./abstract_chart";
import {
  adaptChartRange,
  chartFontColor,
  copyLabelRangeWithNewSheetId,
  getBaselineArrowDirection,
  getBaselineColor,
  getBaselineText,
} from "./chart_common";

chartRegistry.add("scorecard", {
  match: (type) => type === "scorecard",
  createChart: (definition, sheetId, getters) =>
    new ScorecardChart(definition as ScorecardChartDefinition, sheetId, getters),
  getChartRuntime: createScorecardChartRuntime,
  validateChartDefinition: (validator, definition) =>
    ScorecardChart.validateChartDefinition(validator, definition as ScorecardChartDefinition),
  transformDefinition: (
    definition: ScorecardChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => ScorecardChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    ScorecardChart.getDefinitionFromContextCreation(context),
  name: "Scorecard",
});

function checkKeyValue(definition: ScorecardChartDefinition): CommandResult {
  return definition.keyValue && !rangeReference.test(definition.keyValue)
    ? CommandResult.InvalidScorecardKeyValue
    : CommandResult.Success;
}

function checkBaseline(definition: ScorecardChartDefinition): CommandResult {
  return definition.baseline && !rangeReference.test(definition.baseline)
    ? CommandResult.InvalidScorecardBaseline
    : CommandResult.Success;
}

export class ScorecardChart extends AbstractChart {
  readonly keyValue?: Range;
  readonly baseline?: Range;
  readonly baselineMode: "absolute" | "percentage";
  readonly baselineDescr?: string;
  readonly background?: string;
  readonly baselineColorUp: string;
  readonly baselineColorDown: string;
  readonly fontColor?: string;
  readonly type = "scorecard";

  constructor(definition: ScorecardChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.keyValue = createRange(getters, sheetId, definition.keyValue);
    this.baseline = createRange(getters, sheetId, definition.baseline);
    this.baselineMode = definition.baselineMode;
    this.baselineDescr = definition.baselineDescr;
    this.background = definition.background;
    this.baselineColorUp = definition.baselineColorUp;
    this.baselineColorDown = definition.baselineColorDown;
    this.fontColor = definition.fontColor;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScorecardChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkKeyValue, checkBaseline);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScorecardChartDefinition {
    return {
      background: context.background || BACKGROUND_CHART_COLOR,
      type: "scorecard",
      keyValue: context.range,
      title: context.title || "",
      baselineMode: "absolute",
      baselineColorUp: "#00A04A",
      baselineColorDown: "#DC6965",
    };
  }

  static transformDefinition(
    definition: ScorecardChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScorecardChartDefinition {
    let baselineZone: Zone | undefined;
    let keyValueZone: Zone | undefined;

    if (definition.baseline) {
      baselineZone = transformZone(toZone(definition.baseline), executed);
    }
    if (definition.keyValue) {
      keyValueZone = transformZone(toZone(definition.keyValue), executed);
    }
    return {
      ...definition,
      baseline: baselineZone ? zoneToXc(baselineZone) : undefined,
      keyValue: keyValueZone ? zoneToXc(keyValueZone) : undefined,
    };
  }

  copyForSheetId(sheetId: string): ScorecardChart {
    const baseline = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.baseline);
    const keyValue = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.keyValue);
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue);
    return new ScorecardChart(definition, sheetId, this.getters);
  }

  getDefinition(): ScorecardChartDefinition {
    return this.getDefinitionWithSpecificRanges(this.baseline, this.keyValue);
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range: this.keyValue ? this.getters.getRangeString(this.keyValue, this.sheetId) : undefined,
    };
  }

  getSheetIdsUsedInChartRanges(): UID[] {
    const sheetIds: Set<UID> = new Set<UID>();
    if (this.baseline) {
      sheetIds.add(this.baseline.sheetId);
    }
    if (this.keyValue) {
      sheetIds.add(this.keyValue.sheetId);
    }
    return Array.from(sheetIds);
  }

  private getDefinitionWithSpecificRanges(
    baseline: Range | undefined,
    keyValue: Range | undefined
  ): ScorecardChartDefinition {
    return {
      baselineColorDown: this.baselineColorDown,
      baselineColorUp: this.baselineColorUp,
      baselineMode: this.baselineMode,
      title: this.title,
      type: "scorecard",
      background: this.background,
      baseline: baseline ? this.getters.getRangeString(baseline, this.sheetId) : undefined,
      baselineDescr: this.baselineDescr,
      fontColor: this.fontColor,
      keyValue: keyValue ? this.getters.getRangeString(keyValue, this.sheetId) : undefined,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): ScorecardChart {
    const baseline = adaptChartRange(this.baseline, applyChange);
    const keyValue = adaptChartRange(this.keyValue, applyChange);
    if (this.baseline === baseline && this.keyValue === keyValue) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue);
    return new ScorecardChart(definition, this.sheetId, this.getters);
  }
}

function createScorecardChartRuntime(
  chart: ScorecardChart,
  getters: Getters
): ScorecardChartRuntime {
  let keyValue = "";
  let formattedKeyValue = "";
  if (chart.keyValue) {
    const keyValueCell = getters.getCellsInZone(chart.keyValue.sheetId, chart.keyValue.zone)[0];
    keyValue = keyValueCell?.evaluated.value ? String(keyValueCell?.evaluated.value) : "";
    formattedKeyValue = keyValueCell?.formattedValue || "";
  }
  const baseline = chart.baseline ? getters.getRangeValues(chart.baseline)[0] : undefined;
  const baselineStr = baseline !== undefined ? String(baseline) : "";
  return {
    title: chart.title,
    keyValue: formattedKeyValue || keyValue,
    baselineDisplay: getBaselineText(baselineStr, keyValue, chart.baselineMode),
    baselineArrow: getBaselineArrowDirection(baselineStr, keyValue),
    baselineColor: getBaselineColor(
      baselineStr,
      keyValue,
      chart.baselineColorUp,
      chart.baselineColorDown
    ),
    baselineDescr: chart.baselineDescr,
    background: chart.background,
    fontColor: chartFontColor(chart.background),
  };
}
