import { transformZone } from "../../collaborative/ot/ot_helpers";
import { chartRegistry } from "../../registries/chart_types";
import { _lt, _t } from "../../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Cell,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
} from "../../types";
import { ChartCreationContext } from "../../types/chart/chart";
import {
  BaselineMode,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../types/chart/scorecard_chart";
import { Validator } from "../../types/validator";
import { createValidRange } from "../range";
import { mergeReference, rangeReference, splitReference } from "../references";
import { toUnboundedZone, zoneToXc } from "../zones";
import { AbstractChart } from "./abstract_chart";
import {
  adaptChartRange,
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
    sheetId: UID,
    sheetMap: Record<string, UID>,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => ScorecardChart.transformDefinition(definition, sheetId, sheetMap, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    ScorecardChart.getDefinitionFromContextCreation(context),
  getDataSheetMapFromDefinition: (getters: CoreGetters, def: ScorecardChartDefinition) =>
    ScorecardChart.getDataSheetMap(getters, def),
  name: _lt("Scorecard"),
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
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: string;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly fontColor?: Color;
  readonly type = "scorecard";

  constructor(definition: ScorecardChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.keyValue = createValidRange(getters, sheetId, definition.keyValue);
    this.baseline = createValidRange(getters, sheetId, definition.baseline);
    this.baselineMode = definition.baselineMode;
    this.baselineDescr = definition.baselineDescr;
    this.background = definition.background;
    this.baselineColorUp = definition.baselineColorUp;
    this.baselineColorDown = definition.baselineColorDown;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScorecardChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkKeyValue, checkBaseline);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScorecardChartDefinition {
    return {
      background: context.background,
      type: "scorecard",
      keyValue: context.range ? context.range[0] : undefined,
      title: context.title || "",
      baselineMode: "difference",
      baselineColorUp: "#00A04A",
      baselineColorDown: "#DC6965",
      baseline: context.auxiliaryRange || "",
    };
  }

  static transformDefinition(
    definition: ScorecardChartDefinition,
    chartSheetId: UID,
    sheetMap: Record<string, UID>,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScorecardChartDefinition {
    let baselineSheetName: string | undefined;
    let baselineZone: UnboundedZone | undefined;
    let keyValueSheetName: string | undefined;
    let keyValueZone: UnboundedZone | undefined;

    if (definition.baseline) {
      ({ sheetName: baselineSheetName } = splitReference(definition.baseline));
      const sheetId = baselineSheetName ? sheetMap[baselineSheetName] : chartSheetId;
      if (sheetId === executed.sheetId) {
        baselineZone = transformZone(toUnboundedZone(definition.baseline), executed);
      }
    }
    if (definition.keyValue) {
      ({ sheetName: keyValueSheetName } = splitReference(definition.keyValue));
      const sheetId = keyValueSheetName ? sheetMap[keyValueSheetName] : chartSheetId;
      if (sheetId === executed.sheetId) {
        keyValueZone = transformZone(toUnboundedZone(definition.keyValue), executed);
      }
    }
    return {
      ...definition,
      baseline: baselineZone
        ? mergeReference(zoneToXc(baselineZone), baselineSheetName)
        : undefined,
      keyValue: keyValueZone
        ? mergeReference(zoneToXc(keyValueZone), keyValueSheetName)
        : undefined,
    };
  }

  static getDataSheetMap(
    getters: CoreGetters,
    definition: ScorecardChartDefinition
  ): Record<string, UID> {
    const sheetMap: Record<string, UID> = {};
    if (definition.baseline) {
      const { sheetName } = splitReference(definition.baseline);
      const baselineSheetId = getters.getSheetIdByName(sheetName);
      if (sheetName && baselineSheetId) {
        sheetMap[sheetName] = baselineSheetId;
      }
    }
    if (definition.keyValue) {
      const { sheetName } = splitReference(definition.keyValue);
      const keyValueSheetId = getters.getSheetIdByName(sheetName);
      if (sheetName && keyValueSheetId) {
        sheetMap[sheetName] = keyValueSheetId;
      }
    }
    return sheetMap;
  }

  copyForSheetId(sheetId: UID): ScorecardChart {
    const baseline = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.baseline);
    const keyValue = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.keyValue);
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue, sheetId);
    return new ScorecardChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScorecardChart {
    const definition = this.getDefinitionWithSpecificRanges(this.baseline, this.keyValue, sheetId);
    return new ScorecardChart(definition, sheetId, this.getters);
  }

  getDefinition(): ScorecardChartDefinition {
    return this.getDefinitionWithSpecificRanges(this.baseline, this.keyValue);
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range: this.keyValue ? [this.getters.getRangeString(this.keyValue, this.sheetId)] : undefined,
      auxiliaryRange: this.baseline
        ? this.getters.getRangeString(this.baseline, this.sheetId)
        : undefined,
    };
  }

  private getDefinitionWithSpecificRanges(
    baseline: Range | undefined,
    keyValue: Range | undefined,
    targetSheetId?: UID
  ): ScorecardChartDefinition {
    return {
      baselineColorDown: this.baselineColorDown,
      baselineColorUp: this.baselineColorUp,
      baselineMode: this.baselineMode,
      title: this.title,
      type: "scorecard",
      background: this.background,
      baseline: baseline
        ? this.getters.getRangeString(baseline, targetSheetId || this.sheetId)
        : undefined,
      baselineDescr: this.baselineDescr,
      keyValue: keyValue
        ? this.getters.getRangeString(keyValue, targetSheetId || this.sheetId)
        : undefined,
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
  let keyValueCell: Cell | undefined;
  if (chart.keyValue) {
    const keyValueZone = chart.keyValue.zone;
    keyValueCell = getters.getCell(chart.keyValue.sheetId, keyValueZone.left, keyValueZone.top);
    keyValue = keyValueCell?.evaluated.value ? String(keyValueCell?.evaluated.value) : "";
    formattedKeyValue = keyValueCell?.formattedValue || "";
  }
  let baselineCell: Cell | undefined;
  if (chart.baseline) {
    const baselineZone = chart.baseline.zone;
    baselineCell = getters.getCell(chart.baseline.sheetId, baselineZone.left, baselineZone.top);
  }
  const { background, fontColor } = getters.getStyleOfSingleCellChart(
    chart.background,
    chart.keyValue
  );
  return {
    title: _t(chart.title),
    keyValue: formattedKeyValue || keyValue,
    baselineDisplay: getBaselineText(baselineCell, keyValueCell?.evaluated, chart.baselineMode),
    baselineArrow: getBaselineArrowDirection(
      baselineCell?.evaluated,
      keyValueCell?.evaluated,
      chart.baselineMode
    ),
    baselineColor: getBaselineColor(
      baselineCell?.evaluated,
      chart.baselineMode,
      keyValueCell?.evaluated,
      chart.baselineColorUp,
      chart.baselineColorDown
    ),
    baselineDescr: chart.baselineDescr ? _t(chart.baselineDescr) : "",
    fontColor,
    background,
    baselineStyle: chart.baselineMode !== "percentage" ? baselineCell?.style : undefined,
    keyValueStyle: keyValueCell?.style,
  };
}
