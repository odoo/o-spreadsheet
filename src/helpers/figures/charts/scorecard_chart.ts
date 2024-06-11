import { transformZone } from "../../../collaborative/ot/ot_helpers";
import {
  DEFAULT_CHART_PADDING,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import { _t } from "../../../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CellValueType,
  Color,
  CommandResult,
  CoreGetters,
  EvaluatedCell,
  Getters,
  Locale,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
} from "../../../types";
import { ChartCreationContext } from "../../../types/chart/chart";
import {
  BaselineArrowDirection,
  BaselineMode,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../../types/chart/scorecard_chart";
import { Validator } from "../../../types/validator";
import { formatValue, humanizeNumber } from "../../format";
import { isNumber } from "../../numbers";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { clipTextWithEllipsis, drawDecoratedText } from "../../text_helper";
import { toUnboundedZone, zoneToXc } from "../../zones";
import { AbstractChart } from "./abstract_chart";
import { adaptChartRange, copyLabelRangeWithNewSheetId } from "./chart_common";
import { ScorecardChartConfig } from "./scorecard_chart_config_builder";

function getBaselineText(
  baseline: EvaluatedCell | undefined,
  keyValue: EvaluatedCell | undefined,
  baselineMode: BaselineMode,
  humanize: boolean,
  locale: Locale
): string {
  if (!baseline) {
    return "";
  } else if (
    baselineMode === "text" ||
    keyValue?.type !== CellValueType.number ||
    baseline.type !== CellValueType.number
  ) {
    if (humanize) {
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
  if (humanize) {
    return humanizeNumber({ value, format }, locale);
  }
  return formatValue(value, { format, locale });
}

function getKeyValueText(
  keyValueCell: EvaluatedCell | undefined,
  humanize: boolean,
  locale: Locale
): string {
  if (!keyValueCell) {
    return "";
  }
  if (humanize) {
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

const arrowDownPath = new window.Path2D(
  "M8.6 4.8a.5.5 0 0 1 0 .75l-3.9 3.9a.5 .5 0 0 1 -.75 0l-3.8 -3.9a.5 .5 0 0 1 0 -.75l.4-.4a.5.5 0 0 1 .75 0l2.3 2.4v-5.7c0-.25.25-.5.5-.5h.6c.25 0 .5.25.5.5v5.8l2.3 -2.4a.5.5 0 0 1 .75 0z"
);
const arrowUpPath = new window.Path2D(
  "M8.7 5.5a.5.5 0 0 0 0-.75l-3.8-4a.5.5 0 0 0-.75 0l-3.8 4a.5.5 0 0 0 0 .75l.4.4a.5.5 0 0 0 .75 0l2.3-2.4v5.8c0 .25.25.5.5.5h.6c.25 0 .5-.25.5-.5v-5.8l2.2 2.4a.5.5 0 0 0 .75 0z"
);

export class ScorecardChart extends AbstractChart {
  readonly keyValue?: Range;
  readonly baseline?: Range;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: string;
  readonly progressBar: boolean = false;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly fontColor?: Color;
  readonly humanize?: boolean;
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
    this.humanize = definition.humanize ?? false;
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
      keyValue: context.range ? context.range[0].dataRange : undefined,
      title: context.title || { text: "" },
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baseline: context.auxiliaryRange || "",
    };
  }

  static transformDefinition(
    definition: ScorecardChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScorecardChartDefinition {
    let baselineZone: UnboundedZone | undefined;
    let keyValueZone: UnboundedZone | undefined;

    if (definition.baseline) {
      baselineZone = transformZone(toUnboundedZone(definition.baseline), executed);
    }
    if (definition.keyValue) {
      keyValueZone = transformZone(toUnboundedZone(definition.keyValue), executed);
    }
    return {
      ...definition,
      baseline: baselineZone ? zoneToXc(baselineZone) : undefined,
      keyValue: keyValueZone ? zoneToXc(keyValueZone) : undefined,
    };
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
      humanize: this.humanize,
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

export function drawScoreChart(structure: ScorecardChartConfig, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = structure.canvas.width;
  const availableWidth = canvas.width - DEFAULT_CHART_PADDING;
  canvas.height = structure.canvas.height;

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

  if (structure.baselineArrow && structure.baselineArrow.style.size > 0) {
    ctx.save();
    ctx.fillStyle = structure.baselineArrow.style.color;
    ctx.translate(structure.baselineArrow.position.x, structure.baselineArrow.position.y);
    // This ratio is computed according to the original svg size and the final size we want
    const ratio = structure.baselineArrow.style.size / 10;
    ctx.scale(ratio, ratio);
    switch (structure.baselineArrow.direction) {
      case "down": {
        ctx.fill(arrowDownPath);
        break;
      }
      case "up": {
        ctx.fill(arrowUpPath);
        break;
      }
    }
    ctx.restore();
  }

  if (structure.baselineDescr) {
    const descr = structure.baselineDescr[0];
    ctx.font = descr.style.font;
    ctx.fillStyle = descr.style.color;
    for (const description of structure.baselineDescr) {
      ctx.fillText(
        clipTextWithEllipsis(ctx, description.text, canvas.width - description.position.x),
        description.position.x,
        description.position.y
      );
    }
  }

  if (structure.key) {
    ctx.font = structure.key.style.font;
    ctx.fillStyle = structure.key.style.color;
    drawDecoratedText(
      ctx,
      structure.key.text,
      structure.key.position,
      structure.key.style.underline,
      structure.key.style.strikethrough
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
    formattedKeyValue = getKeyValueText(keyValueCell, chart.humanize ?? false, locale);
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
    chart.humanize ?? false,
    locale
  );
  const baselineValue =
    chart.baselineMode === "progress" && isNumber(baselineDisplay, locale)
      ? toNumber(baselineDisplay, locale)
      : 0;
  return {
    title: {
      ...chart.title,
      // chart titles are extracted from .json files and they are translated at runtime here
      text: _t(chart.title.text ?? ""),
    },
    keyValue: formattedKeyValue,
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
      chart.baselineMode !== "progress" && chart.baselineDescr
        ? _t(chart.baselineDescr) // descriptions are extracted from .json files and they are translated at runtime here
        : "",
    fontColor,
    background,
    baselineStyle:
      chart.baselineMode !== "percentage" && chart.baselineMode !== "progress" && baseline
        ? getters.getCellStyle({
            sheetId: baseline.sheetId,
            col: baseline.zone.left,
            row: baseline.zone.top,
          })
        : undefined,
    keyValueStyle: chart.keyValue
      ? getters.getCellStyle({
          sheetId: chart.keyValue.sheetId,
          col: chart.keyValue.zone.left,
          row: chart.keyValue.zone.top,
        })
      : undefined,
    progressBar:
      chart.baselineMode === "progress"
        ? {
            value: baselineValue,
            color: baselineValue > 0 ? chart.baselineColorUp : chart.baselineColorDown,
          }
        : undefined,
  };
}
