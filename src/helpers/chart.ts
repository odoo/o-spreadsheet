import { isDefined, isNumber, relativeLuminance } from ".";
import { toNumber } from "../functions/helpers";
import {
  BaselineArrowDirection,
  BasicChartDefinition,
  ChartDefinition,
  Color,
  Range,
  ScorecardChartDefinition,
  UID,
} from "../types";

const GraphColors = [
  // the same colors as those used in odoo reporting
  "rgb(31,119,180)",
  "rgb(255,127,14)",
  "rgb(174,199,232)",
  "rgb(255,187,120)",
  "rgb(44,160,44)",
  "rgb(152,223,138)",
  "rgb(214,39,40)",
  "rgb(255,152,150)",
  "rgb(148,103,189)",
  "rgb(197,176,213)",
  "rgb(140,86,75)",
  "rgb(196,156,148)",
  "rgb(227,119,194)",
  "rgb(247,182,210)",
  "rgb(127,127,127)",
  "rgb(199,199,199)",
  "rgb(188,189,34)",
  "rgb(219,219,141)",
  "rgb(23,190,207)",
  "rgb(158,218,229)",
];

export class ChartColors {
  private graphColorIndex = 0;

  next(): string {
    return GraphColors[this.graphColorIndex++ % GraphColors.length];
  }
}

/**
 * Choose a font color based on a background color.
 * The font is white with a dark background.
 */
export function chartFontColor(backgroundColor: Color | undefined): Color {
  if (!backgroundColor) {
    return "#000000";
  }
  return relativeLuminance(backgroundColor) < 0.3 ? "#FFFFFF" : "#000000";
}

/** Returns all the ranges contained in a chart definition */
export function getRangesInChartDefinition(definition: ChartDefinition): Range[] {
  const ranges: Range[] = [];
  if ("dataSets" in definition) {
    definition.dataSets.map((ds) => ds.dataRange).map((range) => ranges.push(range));
    definition.dataSets
      .map((ds) => ds.labelCell)
      .filter(isDefined)
      .map((range) => ranges.push(range));
  }
  if ("labelRange" in definition && definition.labelRange) {
    ranges.push(definition.labelRange);
  }
  if ("baseline" in definition && definition.baseline) {
    ranges.push(definition.baseline);
  }
  if ("keyValue" in definition && definition.keyValue) {
    ranges.push(definition.keyValue);
  }
  return ranges;
}

export function getDefaultBasicChartDefinition(sheetId: UID): BasicChartDefinition {
  return {
    type: "line",
    dataSets: [],
    labelRange: undefined,
    title: "",
    background: "#FFFFFF",
    sheetId,
    verticalAxisPosition: "left",
    legendPosition: "top",
    stackedBar: false,
    labelsAsText: false,
  };
}

export function getDefaultScorecardChartDefinition(sheetId: UID): ScorecardChartDefinition {
  return {
    type: "scorecard",
    keyValue: undefined,
    title: "",
    sheetId,
    baselineMode: "absolute",
    baselineColorUp: "#00A04A",
    baselineColorDown: "#DC6965",
    background: "#FFFFFF",
  };
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

export function getBaselineText(
  baseline: string | undefined,
  keyValue: string,
  baselineMode: "absolute" | "percentage"
): string | undefined {
  let baselineValue: string | undefined = undefined;
  if (!baseline) {
    baselineValue = undefined;
  } else if (!isNumber(baseline) || !isNumber(keyValue)) {
    baselineValue = baseline.toString();
  } else {
    let diff = toNumber(keyValue) - toNumber(baseline);
    if (baselineMode === "percentage") {
      diff = (diff / toNumber(baseline)) * 100;
    }
    baselineValue = Math.abs(parseFloat(diff.toFixed(2))).toLocaleString();
    if (baselineMode === "percentage") {
      baselineValue += "%";
    }
  }

  return baselineValue;
}

export function getBaselineColor(
  baseline: string | undefined,
  keyValue: string,
  colorUp: string,
  colorDown: string
): string | undefined {
  if (!isNumber(baseline) || !isNumber(keyValue)) {
    return undefined;
  }
  const diff = toNumber(keyValue) - toNumber(baseline);
  if (diff > 0) {
    return colorUp;
  } else if (diff < 0) {
    return colorDown;
  }
  return undefined;
}

export function getBaselineArrowDirection(
  baseline: string | undefined,
  keyValue: string
): BaselineArrowDirection {
  if (!isNumber(baseline) || !isNumber(keyValue)) {
    return "neutral";
  }

  const diff = toNumber(keyValue) - toNumber(baseline);
  if (diff > 0) {
    return "up";
  } else if (diff < 0) {
    return "down";
  }
  return "neutral";
}
