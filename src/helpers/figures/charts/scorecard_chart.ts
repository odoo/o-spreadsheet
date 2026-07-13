import {
  CHART_PADDING,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
  DEFAULT_TEXT_HIGHLIGHT_PERCENT,
} from "../../../constants";
import { isMultipleElementMatrix, toScalar } from "../../../functions/helper_matrices";
import { toNumber } from "../../../functions/helpers";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CellValueType, EvaluatedCell } from "../../../types/cells";
import {
  BaselineArrowDirection,
  BaselineMode,
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../../types/chart/scorecard_chart";
import { CommandResult } from "../../../types/commands";
import { Locale } from "../../../types/locale";
import { Color, RangeAdapterFunctions } from "../../../types/misc";
import { Range } from "../../../types/range";
import { createEvaluatedCell } from "../../cells/cell_evaluation";
import { lightenColor } from "../../color";
import { formatValue, humanizeNumber } from "../../format/format";
import { isFormula } from "../../misc";
import { isNumber } from "../../numbers";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { clipTextWithEllipsis, drawDecoratedText } from "../../text_helper";
import { AbstractChart } from "./abstract_chart";
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

// Only used to derive a Range when the formula is nothing but a bare reference (e.g. "=A1" or "=A1:B2")
function getFormulaRangeXc(formula: string | undefined): string | undefined {
  if (!formula) {
    return undefined;
  }
  const content = formula.startsWith("=") ? formula.slice(1) : formula;
  return rangeReference.test(content) ? content : undefined;
}

function checkKeyValue(definition: ScorecardChartDefinition): CommandResult {
  if (definition.keyValue && !isFormula(definition.keyValue)) {
    return CommandResult.InvalidScorecardKeyValue;
  }
  return CommandResult.Success;
}

function checkBaseline(definition: ScorecardChartDefinition): CommandResult {
  if (definition.baseline && !isFormula(definition.baseline)) {
    return CommandResult.InvalidScorecardBaseline;
  }
  return CommandResult.Success;
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
    return validator.checkValidations(definition, checkKeyValue, checkBaseline);
  },

  copyInSheetId: (definition) => definition,

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    const dataRange =
      context.dataSource?.type === "range"
        ? context.dataSource?.dataSets?.[0]?.dataRange
        : undefined;
    return {
      background: context.background,
      type: "scorecard",
      keyValue: dataRange ? `=${dataRange}` : undefined,
      title: context.title || { text: "" },
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
      baseline: context.auxiliaryRange ? `=${context.auxiliaryRange}` : undefined,
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

  getRuntime(getters, definition, _dataExtractor, sheetId): ScorecardChartRuntime {
    let formattedKeyValue = "";
    let keyValueCell: EvaluatedCell | undefined;
    const locale = getters.getLocale();
    if (definition.keyValue) {
      const result = getters.evaluateFormulaResult(sheetId, definition.keyValue);
      const scalar = isMultipleElementMatrix(result) ? result[0][0] : toScalar(result);
      keyValueCell = createEvaluatedCell(scalar, locale);
      if (scalar !== null && scalar !== undefined) {
        formattedKeyValue = getKeyValueText(keyValueCell, definition.humanize ?? true, locale);
      } else {
        formattedKeyValue = "";
      }
    }
    let baselineCell: EvaluatedCell | undefined;
    if (definition.baseline) {
      const result = getters.evaluateFormulaResult(sheetId, definition.baseline);
      const scalar = isMultipleElementMatrix(result) ? result[0][0] : toScalar(result);
      baselineCell = createEvaluatedCell(scalar, locale);
    }
    let keyValueRange: Range | undefined = undefined;
    if (definition.keyValue) {
      const keyValueXc = getFormulaRangeXc(definition.keyValue);
      if (keyValueXc) {
        keyValueRange = createValidRange(getters, sheetId, keyValueXc);
      }
    }
    let baselineRange: Range | undefined = undefined;
    if (definition.baseline) {
      const baselineXc = getFormulaRangeXc(definition.baseline);
      if (baselineXc) {
        baselineRange = createValidRange(getters, sheetId, baselineXc);
      }
    }
    const { background, fontColor } = getters.getStyleOfSingleCellChart(
      definition.background,
      keyValueRange
    );

    // A bare reference to an empty cell (e.g. keyValue "=A1" with A1 blank) evaluates to 0
    // as a formula, but should still be treated as "not defined" when compared to the baseline.
    if (keyValueRange) {
      const rawKeyValueCell = getters.getEvaluatedCell({
        sheetId: keyValueRange.sheetId,
        col: keyValueRange.zone.left,
        row: keyValueRange.zone.top,
      });
      if (rawKeyValueCell.type === CellValueType.empty) {
        keyValueCell = undefined;
      }
    }
    if (baselineRange) {
      const rawBaselineCell = getters.getEvaluatedCell({
        sheetId: baselineRange.sheetId,
        col: baselineRange.zone.left,
        row: baselineRange.zone.top,
      });
      if (rawBaselineCell.type === CellValueType.empty) {
        baselineCell = undefined;
      }
    }

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
