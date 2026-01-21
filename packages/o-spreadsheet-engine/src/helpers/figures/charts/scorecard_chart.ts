import {
  CHART_PADDING,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import { CellValueType, EvaluatedCell } from "../../../types/cells";
import {
  BaselineArrowDirection,
  BaselineMode,
  ChartCreationContext,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
  TitleDesign,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { CoreGetters } from "../../../types/core_getters";
import { Getters } from "../../../types/getters";
import { Locale } from "../../../types/locale";
import { Color, RangeAdapterFunctions, UID } from "../../../types/misc";
import { Range } from "../../../types/range";
import { Validator } from "../../../types/validator";
import { formatValue, humanizeNumber } from "../../format/format";
import { isNumber } from "../../numbers";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { clipTextWithEllipsis, drawDecoratedText } from "../../text_helper";
import { AbstractChart } from "./abstract_chart";
import { adaptChartRange, duplicateLabelRangeInDuplicatedSheet } from "./chart_common";
import { ScorecardChartConfig } from "./scorecard_chart_config_builder";

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

const Path2DConstructor = globalThis.Path2D;
const arrowDownPath =
  Path2DConstructor &&
  new Path2DConstructor(
    "M8.6 4.8a.5.5 0 0 1 0 .75l-3.9 3.9a.5 .5 0 0 1 -.75 0l-3.8 -3.9a.5 .5 0 0 1 0 -.75l.4-.4a.5.5 0 0 1 .75 0l2.3 2.4v-5.7c0-.25.25-.5.5-.5h.6c.25 0 .5.25.5.5v5.8l2.3 -2.4a.5.5 0 0 1 .75 0z"
  );
const arrowUpPath =
  Path2DConstructor &&
  new Path2DConstructor(
    "M8.7 5.5a.5.5 0 0 0 0-.75l-3.8-4a.5.5 0 0 0-.75 0l-3.8 4a.5.5 0 0 0 0 .75l.4.4a.5.5 0 0 0 .75 0l2.3-2.4v5.8c0 .25.25.5.5.5h.6c.25 0 .5-.25.5-.5v-5.8l2.2 2.4a.5.5 0 0 0 .75 0z"
  );

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

  static allowedDefinitionKeys: readonly (keyof ScorecardChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "keyValue",
    "keyDescr",
    "baseline",
    "baselineMode",
    "baselineDescr",
    "baselineColorUp",
    "baselineColorDown",
  ] as const;

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
      keyValue: context.dataSource?.dataSets?.[0]?.dataRange,
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
    { adaptRangeString }: RangeAdapterFunctions
  ): ScorecardChartDefinition {
    let baseline: string | undefined;
    let keyValue: string | undefined;
    if (definition.baseline) {
      const { changeType, range: adaptedRange } = adaptRangeString(
        chartSheetId,
        definition.baseline
      );
      if (changeType !== "REMOVE") {
        baseline = adaptedRange;
      }
    }
    if (definition.keyValue) {
      const { changeType, range: adaptedRange } = adaptRangeString(
        chartSheetId,
        definition.keyValue
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
    const definition = this.getDefinition();
    return {
      ...definition,
      dataSource: {
        dataSets: definition.keyValue ? [{ dataRange: definition.keyValue, dataSetId: "0" }] : [],
      },
      auxiliaryRange: definition.baseline,
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

  updateRanges(adapterFunctions: RangeAdapterFunctions): ScorecardChart {
    const baseline = adaptChartRange(this.baseline, adapterFunctions);
    const keyValue = adaptChartRange(this.keyValue, adapterFunctions);
    if (this.baseline === baseline && this.keyValue === keyValue) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue);
    return new ScorecardChart(definition, this.sheetId, this.getters);
  }
}

type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawScoreChart(
  structure: ScorecardChartConfig,
  canvas: HTMLCanvasElement | OffscreenCanvas
) {
  const ctx = canvas.getContext("2d") as Canvas2DContext;
  if (!ctx) {
    throw new Error("Unable to retrieve 2D context from canvas");
  }
  const dpr = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;

  canvas.width = dpr * structure.canvas.width;
  canvas.height = dpr * structure.canvas.height;
  ctx.scale(dpr, dpr);
  const availableWidth = structure.canvas.width - CHART_PADDING;

  ctx.fillStyle = structure.canvas.backgroundColor;
  ctx.fillRect(0, 0, structure.canvas.width, structure.canvas.height);

  if (structure.title) {
    ctx.font = structure.title.style.font;
    ctx.fillStyle = structure.title.style.color;
    const baseline = ctx.textBaseline;
    ctx.textBaseline = "middle";
    ctx.fillText(
      clipTextWithEllipsis(ctx, structure.title.text, availableWidth - structure.title.position.x),
      structure.title.position.x,
      structure.title.position.y
    );
    ctx.textBaseline = baseline;
  }

  if (structure.baseline) {
    ctx.font = structure.baseline.style.font;
    ctx.fillStyle = structure.baseline.style.color;
    drawDecoratedText(
      ctx,
      structure.baseline.text,
      structure.baseline.position,
      structure.baseline.style.underline,
      structure.baseline.style.strikethrough
    );
  }

  if (structure.baselineArrow && structure.baselineArrow.style.size > 0 && Path2DConstructor) {
    ctx.save();
    ctx.fillStyle = structure.baselineArrow.style.color;
    ctx.translate(structure.baselineArrow.position.x, structure.baselineArrow.position.y);
    // This ratio is computed according to the original svg size and the final size we want
    const ratio = structure.baselineArrow.style.size / 10;
    ctx.scale(ratio, ratio);
    switch (structure.baselineArrow.direction) {
      case "down": {
        ctx.fill(arrowDownPath!);
        break;
      }
      case "up": {
        ctx.fill(arrowUpPath!);
        break;
      }
    }
    ctx.restore();
  }

  if (structure.baselineDescr) {
    const descr = structure.baselineDescr;
    ctx.font = descr.style.font;
    ctx.fillStyle = descr.style.color;
    ctx.fillText(
      clipTextWithEllipsis(ctx, descr.text, availableWidth - descr.position.x),
      descr.position.x,
      descr.position.y
    );
  }

  if (structure.key) {
    ctx.font = structure.key.style.font;
    ctx.fillStyle = structure.key.style.color;
    drawDecoratedText(
      ctx,
      clipTextWithEllipsis(ctx, structure.key.text, availableWidth - structure.key.position.x),
      structure.key.position,
      structure.key.style.underline,
      structure.key.style.strikethrough
    );
  }

  if (structure.keyDescr) {
    const descr = structure.keyDescr;
    ctx.font = structure.keyDescr?.style.font ?? descr.style.font;
    ctx.fillStyle = descr.style.color;
    ctx.fillText(
      clipTextWithEllipsis(ctx, descr.text, availableWidth - descr.position.x),
      descr.position.x,
      descr.position.y
    );
  }

  if (structure.progressBar) {
    ctx.fillStyle = structure.progressBar.style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      structure.progressBar.position.x,
      structure.progressBar.position.y,
      structure.progressBar.dimension.width,
      structure.progressBar.dimension.height,
      structure.progressBar.dimension.height / 2
    );
    ctx.fill();
    ctx.fillStyle = structure.progressBar.style.color;
    ctx.beginPath();
    if (structure.progressBar.value > 0) {
      ctx.roundRect(
        structure.progressBar.position.x,
        structure.progressBar.position.y,
        structure.progressBar.dimension.width *
          Math.max(0, Math.min(1.0, structure.progressBar.value)),
        structure.progressBar.dimension.height,
        structure.progressBar.dimension.height / 2
      );
    } else {
      const width =
        structure.progressBar.dimension.width *
        Math.max(0, Math.min(1.0, -structure.progressBar.value));
      ctx.roundRect(
        structure.progressBar.position.x + structure.progressBar.dimension.width - width,
        structure.progressBar.position.y,
        width,
        structure.progressBar.dimension.height,
        structure.progressBar.dimension.height / 2
      );
    }
    ctx.fill();
  }
}

export function createScorecardChartRuntime(
  getters: Getters,
  chart: ScorecardChart
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
  const { background, fontColor } = getters.getStyleOfSingleCellChart(
    chart.background,
    chart.keyValue
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
