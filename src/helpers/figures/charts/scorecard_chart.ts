import { FunctionResultWithStyle } from "../../..";
import {
  CHART_PADDING,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import {
  BaselineArrowDirection,
  BaselineMode,
  ScorecardChartRuntime,
} from "../../../types/chart/scorecard_chart";
import { CommandResult } from "../../../types/commands";
import { Locale } from "../../../types/locale";
import { Color, FunctionResultObject } from "../../../types/misc";
import { formatValue, humanizeNumber } from "../../format/format";
import { isNumber } from "../../numbers";
import { clipTextWithEllipsis, drawDecoratedText } from "../../text_helper";
import { AbstractChart } from "./abstract_chart";
import { ScorecardChartConfig } from "./scorecard_chart_config_builder";

function getBaselineText(
  baseline: FunctionResultWithStyle | undefined,
  keyValue: FunctionResultWithStyle | undefined,
  baselineMode: BaselineMode,
  humanizeNumbers: boolean,
  locale: Locale
): string {
  if (!baseline) {
    return "";
  } else if (
    baselineMode === "text" ||
    typeof keyValue?.value !== "number" ||
    typeof baseline.value !== "number"
  ) {
    if (humanizeNumbers) {
      return humanizeNumber(baseline, locale);
    }
    return formatValue(baseline.value, { format: baseline.format, locale });
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
  keyValueCell: FunctionResultObject | undefined,
  humanizeNumbers: boolean,
  locale: Locale
): string {
  if (!keyValueCell) {
    return "";
  }
  if (humanizeNumbers) {
    return humanizeNumber(keyValueCell, locale);
  }
  return formatValue(keyValueCell.value, { format: keyValueCell.format, locale });
}

function getBaselineColor(
  baseline: FunctionResultWithStyle | undefined,
  baselineMode: BaselineMode,
  keyValue: FunctionResultWithStyle | undefined,
  colorUp: Color,
  colorDown: Color
): Color | undefined {
  if (
    baselineMode === "text" ||
    baselineMode === "progress" ||
    typeof baseline?.value !== "number" ||
    typeof keyValue?.value !== "number"
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
  baseline: FunctionResultWithStyle | undefined,
  keyValue: FunctionResultWithStyle | undefined,
  baselineMode: BaselineMode
): BaselineArrowDirection {
  if (
    baselineMode === "text" ||
    typeof baseline?.value !== "number" ||
    typeof keyValue?.value !== "number"
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
  dataSeriesLimit: 1,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "keyDescr",
    "baselineMode",
    "baselineDescr",
    "baselineColorUp",
    "baselineColorDown",
  ],

  fromStrDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  copyInSheetId: (definition) => definition,

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    return {
      background: context.background,
      type: "scorecard",
      dataSource: dataSourceBuilder.fromContextCreation(context),
      title: context.title || { text: "" },
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      humanize: context.humanize,
    };
  },

  transformDefinition: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  toStrDefinition: (definition) => definition,

  getContextCreation: (definition) => definition,

  getDefinitionForExcel: () => undefined,

  updateRanges: (definition) => definition,

  getRuntime(getters, definition, { extractData }): ScorecardChartRuntime {
    const data = extractData();
    const locale = getters.getLocale();
    const keyValueCell: FunctionResultWithStyle | undefined = data.dataSetsValues[0]?.data[0];
    const formattedKeyValue = getKeyValueText(keyValueCell, definition.humanize ?? true, locale);
    const baselineCell: FunctionResultWithStyle | undefined = data.labelValues[0];
    const { background, fontColor } = getters.getStyleOfSingleCellChart(
      definition.background,
      keyValueCell
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
          baselineCell?.style),
        fontSize: definition.baselineDescr?.fontSize,
        align: definition.baselineDescr?.align,
      },
      baselineDescrStyle: {
        textColor: definition.baselineDescr?.color,
        ...definition.baselineDescr,
      },
      keyValueStyle: {
        ...keyValueCell?.style,
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
  canvas: HTMLCanvasElement | OffscreenCanvas,
  zoom: number = 1
) {
  const ctx = canvas.getContext("2d") as Canvas2DContext;
  if (!ctx) {
    throw new Error("Unable to retrieve 2D context from canvas");
  }
  const dpr = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;

  canvas.width = dpr * structure.canvas.width * zoom;
  canvas.height = dpr * structure.canvas.height * zoom;
  ctx.scale(dpr * zoom, dpr * zoom);
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
