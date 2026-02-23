import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "@odoo/o-spreadsheet-engine/constants";
import { toNumber } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  adaptChartRange,
  duplicateLabelRangeInDuplicatedSheet,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { formatValue, humanizeNumber } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { adaptStringRange } from "@odoo/o-spreadsheet-engine/helpers/formulas";
import { isNumber } from "@odoo/o-spreadsheet-engine/helpers/numbers";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { rangeReference } from "@odoo/o-spreadsheet-engine/helpers/references";
import { CellValueType, EvaluatedCell } from "@odoo/o-spreadsheet-engine/types/cells";
import {
  BaselineArrowDirection,
  BaselineMode,
  ChartCreationContext,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
  TitleDesign,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
import { CoreGetters } from "@odoo/o-spreadsheet-engine/types/core_getters";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import { Locale } from "@odoo/o-spreadsheet-engine/types/locale";
import {
  Color,
  RangeAdapter,
  RangeAdapterFunctions,
  UID,
} from "@odoo/o-spreadsheet-engine/types/misc";
import { Range } from "@odoo/o-spreadsheet-engine/types/range";
import { Validator } from "@odoo/o-spreadsheet-engine/types/validator";
import { getStyleOfSingleCellChart } from "./runtime/chart_colors";

function getBaselineText(
  baseline: EvaluatedCell | undefined,
  keyValue: EvaluatedCell | undefined,
  baselineMode: BaselineMode,
  humanizeNumbers: boolean,
  locale: Locale
): string {
  if (!baseline) {
    return "";
  } else if (
    baselineMode === "text" ||
    keyValue?.type !== CellValueType.number ||
    baseline.type !== CellValueType.number
  ) {
    if (humanizeNumbers) {
      return humanizeNumber(baseline, locale);
    }
    return baseline.formattedValue;
  }
  let { value, format } = baseline;
  if (baselineMode === "progress") {
    value = keyValue.value / value;
    format = "0.0%";
  } else {
    value = Math.abs(keyValue.value - value);
    if (baselineMode === "percentage" && value !== 0) {
      value = value / baseline.value;
    }
    if (baselineMode === "percentage") {
      format = "0.0%";
    }
    if (!format) {
      value = Math.round(value * 100) / 100;
    }
  }
  if (humanizeNumbers) {
    return humanizeNumber({ value, format }, locale);
  }
  return formatValue(value, { format, locale });
}

function getKeyValueText(
  keyValueCell: EvaluatedCell | undefined,
  humanizeNumbers: boolean,
  locale: Locale
): string {
  if (!keyValueCell) {
    return "";
  }
  if (humanizeNumbers) {
    return humanizeNumber(keyValueCell, locale);
  }
  return keyValueCell.formattedValue ?? String(keyValueCell.value ?? "");
}

function getBaselineColor(
  baseline: EvaluatedCell | undefined,
  baselineMode: BaselineMode,
  keyValue: EvaluatedCell | undefined,
  colorUp: Color,
  colorDown: Color
): Color | undefined {
  if (
    baselineMode === "text" ||
    baselineMode === "progress" ||
    baseline?.type !== CellValueType.number ||
    keyValue?.type !== CellValueType.number
  ) {
    return undefined;
  }
  const diff = keyValue.value - baseline.value;
  if (diff > 0) {
    return colorUp;
  } else if (diff < 0) {
    return colorDown;
  }
  return undefined;
}

function getBaselineArrowDirection(
  baseline: EvaluatedCell | undefined,
  keyValue: EvaluatedCell | undefined,
  baselineMode: BaselineMode
): BaselineArrowDirection {
  if (
    baselineMode === "text" ||
    baseline?.type !== CellValueType.number ||
    keyValue?.type !== CellValueType.number
  ) {
    return "neutral";
  }

  const diff = keyValue.value - baseline.value;
  if (diff > 0) {
    return "up";
  } else if (diff < 0) {
    return "down";
  }
  return "neutral";
}

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
  readonly keyDescr?: TitleDesign;
  readonly baseline?: Range;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: TitleDesign;
  readonly progressBar: boolean = false;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly fontColor?: Color;
  readonly humanize: boolean;
  readonly type = "scorecard";

  constructor(definition: ScorecardChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.keyValue = createValidRange(getters, sheetId, definition.keyValue);
    this.keyDescr = definition.keyDescr;
    this.baseline = createValidRange(getters, sheetId, definition.baseline);
    this.baselineMode = definition.baselineMode;
    this.baselineDescr = definition.baselineDescr;
    this.background = definition.background;
    this.baselineColorUp = definition.baselineColorUp ?? DEFAULT_SCORECARD_BASELINE_COLOR_UP;
    this.baselineColorDown = definition.baselineColorDown ?? DEFAULT_SCORECARD_BASELINE_COLOR_DOWN;
    this.humanize = definition.humanize ?? true;
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
      keyValue: context.range?.[0]?.dataRange,
      title: context.title || { text: "" },
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baseline: context.auxiliaryRange || "",
      humanize: context.humanize,
    };
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ScorecardChartDefinition,
    applyChange: RangeAdapter
  ): ScorecardChartDefinition {
    let baseline: string | undefined;
    let keyValue: string | undefined;
    if (definition.baseline) {
      const { changeType, range: adaptedRange } = adaptStringRange(
        chartSheetId,
        definition.baseline,
        applyChange
      );
      if (changeType !== "REMOVE") {
        baseline = adaptedRange;
      }
    }
    if (definition.keyValue) {
      const { changeType, range: adaptedRange } = adaptStringRange(
        chartSheetId,
        definition.keyValue,
        applyChange
      );
      if (changeType !== "REMOVE") {
        keyValue = adaptedRange;
      }
    }
    return {
      ...definition,
      baseline,
      keyValue,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): ScorecardChart {
    const baseline = duplicateLabelRangeInDuplicatedSheet(this.sheetId, newSheetId, this.baseline);
    const keyValue = duplicateLabelRangeInDuplicatedSheet(this.sheetId, newSheetId, this.keyValue);
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue, newSheetId);
    return new ScorecardChart(definition, newSheetId, this.getters);
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
      ...this,
      range: this.keyValue
        ? [{ dataRange: this.getters.getRangeString(this.keyValue, this.sheetId) }]
        : undefined,
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
      keyDescr: this.keyDescr,
      humanize: this.humanize,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): ScorecardChart {
    const baseline = adaptChartRange(this.baseline, applyChange);
    const keyValue = adaptChartRange(this.keyValue, applyChange);
    if (this.baseline === baseline && this.keyValue === keyValue) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue);
    return new ScorecardChart(definition, this.sheetId, this.getters);
  }
}

export function createScorecardChartRuntime(
  chart: ScorecardChart,
  getters: Getters
): ScorecardChartRuntime {
  let formattedKeyValue = "";
  let keyValueCell: EvaluatedCell | undefined;
  const locale = getters.getLocale();
  if (chart.keyValue) {
    const keyValuePosition = {
      sheetId: chart.keyValue.sheetId,
      col: chart.keyValue.zone.left,
      row: chart.keyValue.zone.top,
    };
    keyValueCell = getters.getEvaluatedCell(keyValuePosition);
    formattedKeyValue = getKeyValueText(keyValueCell, chart.humanize ?? true, locale);
  }
  let baselineCell: EvaluatedCell | undefined;
  const baseline = chart.baseline;
  if (baseline) {
    const baselinePosition = {
      sheetId: baseline.sheetId,
      col: baseline.zone.left,
      row: baseline.zone.top,
    };
    baselineCell = getters.getEvaluatedCell(baselinePosition);
  }
  const { background, fontColor } = getStyleOfSingleCellChart(
    chart.background,
    chart.keyValue,
    getters
  );

  const baselineDisplay = getBaselineText(
    baselineCell,
    keyValueCell,
    chart.baselineMode,
    chart.humanize ?? true,
    locale
  );
  const baselineValue =
    chart.baselineMode === "progress" && isNumber(baselineDisplay, locale)
      ? toNumber(baselineDisplay, locale)
      : 0;
  return {
    title: {
      ...chart.title,
      text: chart.title.text ? getters.dynamicTranslate(chart.title.text) : "",
    },
    keyValue: formattedKeyValue,
    keyDescr: chart.keyDescr?.text ? getters.dynamicTranslate(chart.keyDescr.text) : "",
    baselineDisplay,
    baselineArrow: getBaselineArrowDirection(baselineCell, keyValueCell, chart.baselineMode),
    baselineColor: getBaselineColor(
      baselineCell,
      chart.baselineMode,
      keyValueCell,
      chart.baselineColorUp,
      chart.baselineColorDown
    ),
    baselineDescr:
      chart.baselineMode !== "progress" && chart.baselineDescr?.text
        ? getters.dynamicTranslate(chart.baselineDescr.text)
        : "",
    fontColor,
    background,
    baselineStyle: {
      ...(chart.baselineMode !== "percentage" && chart.baselineMode !== "progress" && baseline
        ? getters.getCellComputedStyle({
            sheetId: baseline.sheetId,
            col: baseline.zone.left,
            row: baseline.zone.top,
          })
        : undefined),
      fontSize: chart.baselineDescr?.fontSize,
      align: chart.baselineDescr?.align,
    },
    baselineDescrStyle: { textColor: chart.baselineDescr?.color, ...chart.baselineDescr },
    keyValueStyle: {
      ...(chart.keyValue
        ? getters.getCellComputedStyle({
            sheetId: chart.keyValue.sheetId,
            col: chart.keyValue.zone.left,
            row: chart.keyValue.zone.top,
          })
        : undefined),
      fontSize: chart.keyDescr?.fontSize,
      align: chart.keyDescr?.align,
    },
    keyValueDescrStyle: { textColor: chart.keyDescr?.color, ...chart.keyDescr },
    progressBar:
      chart.baselineMode === "progress"
        ? {
            value: baselineValue,
            color: baselineValue > 0 ? chart.baselineColorUp : chart.baselineColorDown,
          }
        : undefined,
  };
}
