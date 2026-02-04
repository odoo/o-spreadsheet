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

  constructor(
    private definition: ScorecardChartDefinition<Range>,
    sheetId: UID,
    getters: CoreGetters
  ) {
    super(sheetId, getters);
  }

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ScorecardChartDefinition<string>
  ) {
    const baseline = createValidRange(getters, sheetId, definition.baseline);
    const keyValue = createValidRange(getters, sheetId, definition.keyValue);
    const rangeDefinition: ScorecardChartDefinition<Range> = {
      ...definition,
      baseline,
      keyValue,
    };
    return new ScorecardChart(rangeDefinition, sheetId, getters);
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

  duplicateInDuplicatedSheet(newSheetId: UID): ScorecardChartDefinition<Range> {
    const baseline = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.definition.baseline
    );
    const keyValue = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.definition.keyValue
    );
    return this.getDefinitionWithSpecificRanges(baseline, keyValue, newSheetId);
  }

  copyInSheetId(sheetId: UID): ScorecardChart {
    const definition = this.getDefinitionWithSpecificRanges(
      this.definition.baseline,
      this.definition.keyValue,
      sheetId
    );
    return new ScorecardChart(definition, sheetId, this.getters);
  }

  getRangeDefinition(): ScorecardChartDefinition<Range> {
    return this.getDefinitionWithSpecificRanges(this.definition.baseline, this.definition.keyValue);
  }

  getDefinition(): ScorecardChartDefinition<string> {
    return {
      ...this.definition,
      keyValue: this.definition.keyValue
        ? this.getters.getRangeString(this.definition.keyValue, this.sheetId)
        : undefined,
      baseline: this.definition.baseline
        ? this.getters.getRangeString(this.definition.baseline, this.sheetId)
        : undefined,
    };
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
  ): ScorecardChartDefinition<Range> {
    return {
      ...this.definition,
      baseline: baseline,
      keyValue: keyValue,
    };
  }

  getDefinitionForExcel() {
    // This kind of graph is not exportable in Excel
    return undefined;
  }

  updateRanges(adapterFunctions: RangeAdapterFunctions): ScorecardChart {
    const baseline = adaptChartRange(this.definition.baseline, adapterFunctions);
    const keyValue = adaptChartRange(this.definition.keyValue, adapterFunctions);
    if (this.definition.baseline === baseline && this.definition.keyValue === keyValue) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificRanges(baseline, keyValue);
    return new ScorecardChart(definition, this.sheetId, this.getters);
  }

  getRuntime(getters: Getters): ScorecardChartRuntime {
    let formattedKeyValue = "";
    let keyValueCell: EvaluatedCell | undefined;
    const locale = getters.getLocale();
    if (this.definition.keyValue) {
      const keyValuePosition = {
        sheetId: this.definition.keyValue.sheetId,
        col: this.definition.keyValue.zone.left,
        row: this.definition.keyValue.zone.top,
      };
      keyValueCell = getters.getEvaluatedCell(keyValuePosition);
      formattedKeyValue = getKeyValueText(keyValueCell, this.definition.humanize ?? true, locale);
    }
    let baselineCell: EvaluatedCell | undefined;
    const baseline = this.definition.baseline;
    if (baseline) {
      const baselinePosition = {
        sheetId: baseline.sheetId,
        col: baseline.zone.left,
        row: baseline.zone.top,
      };
      baselineCell = getters.getEvaluatedCell(baselinePosition);
    }
    const { background, fontColor } = getters.getStyleOfSingleCellChart(
      this.definition.background,
      this.definition.keyValue
    );

    const baselineDisplay = getBaselineText(
      baselineCell,
      keyValueCell,
      this.definition.baselineMode,
      this.definition.humanize ?? true,
      locale
    );
    const baselineValue =
      this.definition.baselineMode === "progress" && isNumber(baselineDisplay, locale)
        ? toNumber(baselineDisplay, locale)
        : 0;
    const title = this.definition.title;
    return {
      title: {
        ...title,
        text: title.text ? getters.dynamicTranslate(title.text) : "",
      },
      keyValue: formattedKeyValue,
      keyDescr: this.definition.keyDescr?.text
        ? getters.dynamicTranslate(this.definition.keyDescr.text)
        : "",
      baselineDisplay,
      baselineArrow: getBaselineArrowDirection(
        baselineCell,
        keyValueCell,
        this.definition.baselineMode
      ),
      baselineColor: getBaselineColor(
        baselineCell,
        this.definition.baselineMode,
        keyValueCell,
        this.definition.baselineColorUp,
        this.definition.baselineColorDown
      ),
      baselineDescr:
        this.definition.baselineMode !== "progress" && this.definition.baselineDescr?.text
          ? getters.dynamicTranslate(this.definition.baselineDescr.text)
          : "",
      fontColor,
      background,
      baselineStyle: {
        ...(this.definition.baselineMode !== "percentage" &&
        this.definition.baselineMode !== "progress" &&
        baseline
          ? getters.getCellComputedStyle({
              sheetId: baseline.sheetId,
              col: baseline.zone.left,
              row: baseline.zone.top,
            })
          : undefined),
        fontSize: this.definition.baselineDescr?.fontSize,
        align: this.definition.baselineDescr?.align,
      },
      baselineDescrStyle: {
        textColor: this.definition.baselineDescr?.color,
        ...this.definition.baselineDescr,
      },
      keyValueStyle: {
        ...(this.definition.keyValue
          ? getters.getCellComputedStyle({
              sheetId: this.definition.keyValue.sheetId,
              col: this.definition.keyValue.zone.left,
              row: this.definition.keyValue.zone.top,
            })
          : undefined),
        fontSize: this.definition.keyDescr?.fontSize,
        align: this.definition.keyDescr?.align,
      },
      keyValueDescrStyle: {
        textColor: this.definition.keyDescr?.color,
        ...this.definition.keyDescr,
      },
      progressBar:
        this.definition.baselineMode === "progress"
          ? {
              value: baselineValue,
              color:
                baselineValue > 0
                  ? this.definition.baselineColorUp
                  : this.definition.baselineColorDown,
            }
          : undefined,
    };
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
