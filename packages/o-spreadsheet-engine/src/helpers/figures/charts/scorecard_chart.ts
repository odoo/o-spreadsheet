import {
  CHART_PADDING,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CellValueType, EvaluatedCell } from "../../../types/cells";
import {
  BaselineArrowDirection,
  BaselineMode,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { Locale } from "../../../types/locale";
import { Color, RangeAdapterFunctions } from "../../../types/misc";
import { Range } from "../../../types/range";
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

export const ScorecardChart: ChartTypeBuilder<"scorecard"> = {
  sequence: 40,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "keyValue",
    "keyDescr",
    "baseline",
    "baselineMode",
    "baselineDescr",
    "baselineColorUp",
    "baselineColorDown",
  ],

  fromStrDefinition(definition, sheetId, getters) {
    const baseline = createValidRange(getters, sheetId, definition.baseline);
    const keyValue = createValidRange(getters, sheetId, definition.keyValue);
    const rangeDefinition: ScorecardChartDefinition<Range> = {
      ...definition,
      baseline,
      keyValue,
    };
    return rangeDefinition;
  },

  validateDefinition(validator, definition) {
    return validator.checkValidations(definition, checkKeyValue, checkBaseline);
  },

  copyInSheetId: (definition) => definition,

  getDefinitionFromContextCreation(context) {
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
  },

  transformDefinition(definition, chartSheetId, { adaptRangeString }) {
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
  },

  duplicateInDuplicatedSheet(definition, sheetIdFrom, sheetIdTo): ScorecardChartDefinition<Range> {
    const baseline = duplicateLabelRangeInDuplicatedSheet(
      sheetIdFrom,
      sheetIdTo,
      definition.baseline
    );
    const keyValue = duplicateLabelRangeInDuplicatedSheet(
      sheetIdFrom,
      sheetIdTo,
      definition.keyValue
    );
    return { ...definition, baseline, keyValue };
  },

  toStrDefinition(definition, sheetId, getters) {
    return {
      ...definition,
      keyValue: definition.keyValue
        ? getters.getRangeString(definition.keyValue, sheetId)
        : undefined,
      baseline: definition.baseline
        ? getters.getRangeString(definition.baseline, sheetId)
        : undefined,
    };
  },

  getContextCreation(definition, dataSource) {
    return {
      ...definition,
      dataSource: {
        dataSets: definition.keyValue ? [{ dataRange: definition.keyValue, dataSetId: "0" }] : [],
      },
      auxiliaryRange: definition.baseline,
    };
  },

  getDefinitionForExcel: () => undefined,

  updateRanges(definition, adapterFunctions: RangeAdapterFunctions) {
    const baseline = adaptChartRange(definition.baseline, adapterFunctions);
    const keyValue = adaptChartRange(definition.keyValue, adapterFunctions);
    if (definition.baseline === baseline && definition.keyValue === keyValue) {
      return definition;
    }
    return { ...definition, baseline, keyValue };
  },

  getRuntime(getters, definition): ScorecardChartRuntime {
    let formattedKeyValue = "";
    let keyValueCell: EvaluatedCell | undefined;
    const locale = getters.getLocale();
    if (definition.keyValue) {
      const keyValuePosition = {
        sheetId: definition.keyValue.sheetId,
        col: definition.keyValue.zone.left,
        row: definition.keyValue.zone.top,
      };
      keyValueCell = getters.getEvaluatedCell(keyValuePosition);
      formattedKeyValue = getKeyValueText(keyValueCell, definition.humanize ?? true, locale);
    }
    let baselineCell: EvaluatedCell | undefined;
    const baseline = definition.baseline;
    if (baseline) {
      const baselinePosition = {
        sheetId: baseline.sheetId,
        col: baseline.zone.left,
        row: baseline.zone.top,
      };
      baselineCell = getters.getEvaluatedCell(baselinePosition);
    }
    const { background, fontColor } = getters.getStyleOfSingleCellChart(
      definition.background,
      definition.keyValue
    );

    const baselineDisplay = getBaselineText(
      baselineCell,
      keyValueCell,
      definition.baselineMode,
      definition.humanize ?? true,
      locale
    );
    const baselineValue =
      definition.baselineMode === "progress" && isNumber(baselineDisplay, locale)
        ? toNumber(baselineDisplay, locale)
        : 0;
    const title = definition.title;
    return {
      title: {
        ...title,
        text: title.text ? getters.dynamicTranslate(title.text) : "",
      },
      keyValue: formattedKeyValue,
      keyDescr: definition.keyDescr?.text ? getters.dynamicTranslate(definition.keyDescr.text) : "",
      baselineDisplay,
      baselineArrow: getBaselineArrowDirection(baselineCell, keyValueCell, definition.baselineMode),
      baselineColor: getBaselineColor(
        baselineCell,
        definition.baselineMode,
        keyValueCell,
        definition.baselineColorUp,
        definition.baselineColorDown
      ),
      baselineDescr:
        definition.baselineMode !== "progress" && definition.baselineDescr?.text
          ? getters.dynamicTranslate(definition.baselineDescr.text)
          : "",
      fontColor,
      background,
      baselineStyle: {
        ...(definition.baselineMode !== "percentage" &&
        definition.baselineMode !== "progress" &&
        baseline
          ? getters.getCellComputedStyle({
              sheetId: baseline.sheetId,
              col: baseline.zone.left,
              row: baseline.zone.top,
            })
          : undefined),
        fontSize: definition.baselineDescr?.fontSize,
        align: definition.baselineDescr?.align,
      },
      baselineDescrStyle: {
        textColor: definition.baselineDescr?.color,
        ...definition.baselineDescr,
      },
      keyValueStyle: {
        ...(definition.keyValue
          ? getters.getCellComputedStyle({
              sheetId: definition.keyValue.sheetId,
              col: definition.keyValue.zone.left,
              row: definition.keyValue.zone.top,
            })
          : undefined),
        fontSize: definition.keyDescr?.fontSize,
        align: definition.keyDescr?.align,
      },
      keyValueDescrStyle: {
        textColor: definition.keyDescr?.color,
        ...definition.keyDescr,
      },
      progressBar:
        definition.baselineMode === "progress"
          ? {
              value: baselineValue,
              color: baselineValue > 0 ? definition.baselineColorUp : definition.baselineColorDown,
            }
          : undefined,
    };
  },
};

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
