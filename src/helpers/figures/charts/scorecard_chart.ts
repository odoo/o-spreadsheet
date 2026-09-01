import { ColorThemeName } from "../../..";
import {
  CHART_PADDING,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
  DEFAULT_TEXT_HIGHLIGHT_PERCENT,
} from "../../../constants";
import { CompiledFormula } from "../../../formulas/compiler";
import { isMultipleElementMatrix, toScalar } from "../../../functions/helper_matrices";
import { toNumber } from "../../../functions/helpers";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CellValueType } from "../../../types/cells";
import {
  BaselineArrowDirection,
  BaselineMode,
  ScorecardChartRuntime,
} from "../../../types/chart/scorecard_chart";
import { CommandResult } from "../../../types/commands";
import { EvaluationGetters } from "../../../types/getters";
import { Locale } from "../../../types/locale";
import { Color, FunctionResultObject, RangeAdapterFunctions, UID } from "../../../types/misc";
import { Range } from "../../../types/range";
import { lightenColor } from "../../color";
import { formatValue, humanizeNumber } from "../../format/format";
import { isFormula } from "../../misc";
import { isNumber } from "../../numbers";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { clipTextWithEllipsis, drawDecoratedText } from "../../text_helper";
import { AbstractChart } from "./abstract_chart";
import { ScorecardChartConfig } from "./scorecard_chart_config_builder";

function getData(
  value: string | undefined,
  getters: EvaluationGetters,
  sheetId: UID
): { scalar: FunctionResultObject | undefined; range: Range | undefined } {
  if (!value) {
    return { scalar: undefined, range: undefined };
  }
  if (!isFormula(value)) {
    return { scalar: { value }, range: undefined };
  }
  const result = getters.evaluateFormulaResult(sheetId, value);
  let scalar = isMultipleElementMatrix(result) ? result[0][0] : toScalar(result);
  let range: Range | undefined = undefined;
  const xc = getFormulaRangeXc(value);
  if (xc) {
    range = createValidRange(getters, sheetId, xc);
    if (range) {
      const cell = getters.getEvaluatedCell({
        sheetId: range.sheetId,
        col: range.zone.left,
        row: range.zone.top,
      });
      if (cell.type === CellValueType.empty) {
        scalar = undefined;
      }
    }
  }
  return { scalar, range };
}

function getBaselineText(
  baseline: FunctionResultObject | undefined,
  keyValue: FunctionResultObject | undefined,
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
  keyValue: FunctionResultObject | undefined,
  humanizeNumbers: boolean,
  locale: Locale
): string {
  if (keyValue?.value === undefined || keyValue?.value === null) {
    return "";
  }
  if (humanizeNumbers) {
    return humanizeNumber(keyValue, locale);
  }
  return keyValue.format
    ? formatValue(keyValue.value, { format: keyValue.format, locale })
    : String(keyValue.value ?? "");
}

function getBaselineColor(
  baseline: FunctionResultObject | undefined,
  baselineMode: BaselineMode,
  keyValue: FunctionResultObject | undefined,
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
  baseline: FunctionResultObject | undefined,
  keyValue: FunctionResultObject | undefined,
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

// Only used to derive a Range when the formula is nothing but a bare reference (e.g. "=A1" or "=A1:B2")
function getFormulaRangeXc(formula: string | undefined): string | undefined {
  if (!formula || !isFormula(formula)) {
    return undefined;
  }
  const content = formula.slice(1);
  return rangeReference.test(content) ? content : undefined;
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

  fromStrDefinition: (definition) => definition,

  validateDefinition(validator, definition) {
    return CommandResult.Success;
  },

  copyInSheetId: (definition, sheetIdFrom, sheetIdTo, getters) => {
    const adaptFormula = (formula: string) =>
      getters.copyFormulaStringForSheet(sheetIdFrom, sheetIdTo, formula, "keepSameReference");
    return {
      ...definition,
      keyValue: definition.keyValue ? adaptFormula(definition.keyValue) : definition.keyValue,
      baseline: definition.baseline ? adaptFormula(definition.baseline) : definition.baseline,
    };
  },

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    const dataRange =
      context.dataSource?.type === "range"
        ? context.dataSource?.dataSets?.[0]?.dataRange
        : undefined;
    // We should update the keyValue if one of these conditions is true:
    // 1. The keyValue formula is undefined (i.e. the chart was created from another chart)
    // 2. The keyValue formula is a bare reference (e.g. "=A1" or "=A1:B2")
    const shouldUpdateKeyValue =
      context.scorecardKeyValueFormula === undefined ||
      getFormulaRangeXc(context.scorecardKeyValueFormula);
    const keyValue =
      shouldUpdateKeyValue && dataRange ? `=${dataRange}` : context.scorecardKeyValueFormula;
    const shouldUpdateBaseline =
      context.scorecardBaselineFormula === undefined ||
      getFormulaRangeXc(context.scorecardBaselineFormula);
    const baseline =
      shouldUpdateBaseline && context.auxiliaryRange
        ? `=${context.auxiliaryRange}`
        : context.scorecardBaselineFormula;
    return {
      background: context.background,
      type: "scorecard",
      keyValue,
      title: context.title || { text: "" },
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baseline,
      humanize: context.humanize,
      annotationLink: context.annotationLink,
      annotationText: context.annotationText,
    };
  },

  transformDefinition(definition, chartSheetId, { adaptFormulaString }) {
    let baseline: string | undefined;
    let keyValue: string | undefined;
    if (definition.baseline) {
      baseline = adaptFormulaString(chartSheetId, definition.baseline);
    }
    if (definition.keyValue) {
      keyValue = adaptFormulaString(chartSheetId, definition.keyValue);
    }
    return {
      ...definition,
      baseline,
      keyValue,
    };
  },

  duplicateInDuplicatedSheet(definition, sheetIdFrom, sheetIdTo, getters) {
    const adaptFormula = (formula: string) =>
      getters.copyFormulaStringForSheet(sheetIdFrom, sheetIdTo, formula, "moveReference");
    return {
      ...definition,
      keyValue: definition.keyValue ? adaptFormula(definition.keyValue) : definition.keyValue,
      baseline: definition.baseline ? adaptFormula(definition.baseline) : definition.baseline,
    };
  },

  toStrDefinition: (definition) => definition,

  getContextCreation(definition, dataSource) {
    const keyValueXc = getFormulaRangeXc(definition.keyValue);
    return {
      ...definition,
      dataSource: {
        type: "range",
        dataSets: keyValueXc ? [{ dataRange: keyValueXc, dataSetId: "0" }] : [],
      },
      auxiliaryRange: getFormulaRangeXc(definition.baseline),
      scorecardKeyValueFormula: definition.keyValue,
      scorecardBaselineFormula: definition.baseline,
    };
  },

  getDefinitionForExcel: () => undefined,

  updateRanges(definition, adapterFunctions: RangeAdapterFunctions, sheetId) {
    const baseline = definition.baseline
      ? adapterFunctions.adaptFormulaString(sheetId, definition.baseline)
      : definition.baseline;
    const keyValue = definition.keyValue
      ? adapterFunctions.adaptFormulaString(sheetId, definition.keyValue)
      : definition.keyValue;
    if (definition.baseline === baseline && definition.keyValue === keyValue) {
      return definition;
    }
    return { ...definition, baseline, keyValue };
  },

  getFormulas(getters, sheetId, definition): CompiledFormula[] {
    const formulas: CompiledFormula[] = [];
    if (definition.keyValue && isFormula(definition.keyValue)) {
      formulas.push(CompiledFormula.Compile(definition.keyValue, sheetId, getters));
    }
    if (definition.baseline && isFormula(definition.baseline)) {
      formulas.push(CompiledFormula.Compile(definition.baseline, sheetId, getters));
    }
    return formulas;
  },

  getRuntime(
    getters,
    definition,
    _dataExtractor,
    sheetId,
    eventHandlers,
    colorThemeName: ColorThemeName
  ): ScorecardChartRuntime {
    let formattedKeyValue = "";
    const { scalar: keyValue, range: keyValueRange } = getData(
      definition.keyValue,
      getters,
      sheetId
    );
    const locale = getters.getLocale();
    if (keyValue !== null && keyValue !== undefined) {
      formattedKeyValue = getKeyValueText(keyValue, definition.humanize ?? true, locale);
    } else {
      formattedKeyValue = "";
    }

    const { scalar: baseline, range: baselineRange } = getData(
      definition.baseline,
      getters,
      sheetId
    );
    const { background, fontColor } = getters.getStyleOfSingleCellChart(
      definition.background,
      keyValueRange,
      colorThemeName
    );

    const baselineDisplay = getBaselineText(
      baseline,
      keyValue,
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
      baselineArrow: getBaselineArrowDirection(baseline, keyValue, definition.baselineMode),
      baselineColor: getBaselineColor(
        baseline,
        definition.baselineMode,
        keyValue,
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
        baselineRange
          ? getters.getCellComputedStyle({
              sheetId: baselineRange.sheetId,
              col: baselineRange.zone.left,
              row: baselineRange.zone.top,
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
        ...(keyValueRange
          ? getters.getCellComputedStyle({
              sheetId: keyValueRange.sheetId,
              col: keyValueRange.zone.left,
              row: keyValueRange.zone.top,
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
      structure.baseline.style.strikethrough,
      undefined,
      structure.baseline.style.highlightText
    );
  }

  if (structure.baselineArrow && structure.baselineArrow.style.size > 0 && Path2DConstructor) {
    ctx.save();
    ctx.fillStyle = structure.baselineArrow.style.highlight
      ? lightenColor(structure.baselineArrow.style.color, DEFAULT_TEXT_HIGHLIGHT_PERCENT)
      : structure.baselineArrow.style.color;
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
    drawDecoratedText(
      ctx,
      clipTextWithEllipsis(ctx, descr.text, availableWidth - descr.position.x),
      descr.position,
      undefined,
      undefined,
      undefined,
      structure.baseline?.style.highlightText
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
      structure.key.style.strikethrough,
      undefined,
      structure.key.style.highlightText
    );
  }

  if (structure.keyDescr) {
    const descr = structure.keyDescr;
    ctx.font = structure.keyDescr?.style.font ?? descr.style.font;
    ctx.fillStyle = descr.style.color;
    drawDecoratedText(
      ctx,
      clipTextWithEllipsis(ctx, descr.text, availableWidth - descr.position.x),
      descr.position,
      undefined,
      undefined,
      undefined,
      structure.key?.style.highlightText
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
