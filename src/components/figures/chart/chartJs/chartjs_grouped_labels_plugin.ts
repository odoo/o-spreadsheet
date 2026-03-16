import type { ChartType, Plugin } from "chart.js";
import { Color } from "../../../../types";

/**
 * Height (in px) reserved below the x-axis for each extra label level.
 * Includes room for the bracket line, notches and text.
 */
const LEVEL_HEIGHT = 22;
/** Base bottom padding matching getChartLayout (CHART_PADDING_BOTTOM). */
const BASE_BOTTOM_PADDING = 10;
/** Vertical gap between the bottom of the tick area and the top of the bracket notches. */
const LINE_MARGIN = 3;
/** Height of the vertical bracket notches. */
const NOTCH_SIZE = 5;
/** Gap between the bracket line and the text. */
const TEXT_MARGIN = 2;
/** Horizontal inset so brackets don't touch the bar edges. */
const BRACKET_INSET = 2;

export interface ChartGroupedLabelsPluginOptions {
  /** Enable the grouped-labels rendering. */
  enabled: boolean;
  /** Color used for bracket lines and text. */
  fontColor: Color;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartGroupedLabelsPlugin?: ChartGroupedLabelsPluginOptions;
  }
}

interface LabelGroup {
  start: number;
  end: number;
  label: string;
}

/**
 * Scan a column of label arrays for a given depth level and return the
 * groups of consecutive rows that share the same non-empty parent label.
 */
function findGroups(labels: string[][], level: number): LabelGroup[] {
  const groups: LabelGroup[] = [];
  let current: LabelGroup | null = null;

  for (let i = 0; i < labels.length; i++) {
    const val = labels[i]?.[level] ?? "";
    if (val !== "") {
      if (current) {
        groups.push(current);
      }
      current = { start: i, end: i, label: val };
    } else if (current) {
      current.end = i;
    }
  }
  if (current) {
    groups.push(current);
  }
  return groups;
}

/** Center-of-left-edge of the group's first bar (or chart area left if index 0). */
function getLeftEdge(scale: any, index: number, total: number): number {
  if (index === 0) {
    return scale.left;
  }
  return (scale.getPixelForTick(index - 1) + scale.getPixelForTick(index)) / 2;
}

/** Center-of-right-edge of the group's last bar (or chart area right if last index). */
function getRightEdge(scale: any, index: number, total: number): number {
  if (index === total - 1) {
    return scale.right;
  }
  return (scale.getPixelForTick(index) + scale.getPixelForTick(index + 1)) / 2;
}

/**
 * Chart.js plugin that draws bracket-style group indicators below the x-axis
 * when labels are multi-dimensional arrays (i.e., when multiple label ranges
 * are used, typically after converting from a treemap / sunburst chart).
 *
 * For each secondary label level, it draws a horizontal line spanning every
 * bar that belongs to the same parent category, with short vertical notches at
 * both ends and the group name centered below the line.
 *
 * Example (2-level labels – leaf first, root last):
 *
 *   ┌─────┬─────┬─────┬─────┬─────┬─────┐
 *   │ Q1  │ Q2  │ Q3  │ Q1  │ Q2  │ Q3  │
 *   └──────────────────┴──────────────────┘
 *         2024                2025
 */
export const chartGroupedLabelsPlugin: Plugin = {
  id: "chartGroupedLabelsPlugin",

  /**
   * Reserve extra bottom canvas padding for each additional label level so
   * the brackets fit without overlapping the x-axis tick labels.
   */
  beforeLayout(chart: any, _args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const labels = chart.config.data.labels as any[];
    if (!Array.isArray(labels?.[0])) {
      return;
    }
    const numLevels = (labels[0] as string[]).length - 1;
    if (numLevels <= 0) {
      return;
    }
    chart.options.layout.padding.bottom = BASE_BOTTOM_PADDING + numLevels * LEVEL_HEIGHT;
  },

  /**
   * Draw the bracket groups after all datasets and axes have been rendered.
   */
  afterDraw(chart: any, _args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const labels = chart.data.labels as any[];
    if (!Array.isArray(labels?.[0])) {
      return;
    }
    const numLevels = (labels[0] as string[]).length;
    if (numLevels <= 1) {
      return;
    }

    const scale = chart.scales.x;
    // Do not draw on linear/time axes (only meaningful on category axis).
    if (!scale || scale.type === "time" || scale.type === "linear") {
      return;
    }

    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = options.fontColor;
    ctx.fillStyle = options.fontColor;
    ctx.font = `11px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const labelCount = labels.length;

    for (let level = 1; level < numLevels; level++) {
      const groups = findGroups(labels as string[][], level);
      // Y coordinates for this level
      const notchTopY = scale.bottom + LINE_MARGIN + (level - 1) * LEVEL_HEIGHT;
      const lineY = notchTopY + NOTCH_SIZE;
      const textY = lineY + TEXT_MARGIN;

      for (const group of groups) {
        const x1 = getLeftEdge(scale, group.start, labelCount) + BRACKET_INSET;
        const x2 = getRightEdge(scale, group.end, labelCount) - BRACKET_INSET;

        // Draw bracket: left notch + horizontal line + right notch
        ctx.beginPath();
        ctx.moveTo(x1, notchTopY);
        ctx.lineTo(x1, lineY);
        ctx.lineTo(x2, lineY);
        ctx.lineTo(x2, notchTopY);
        ctx.stroke();

        // Draw group label centered below the bracket line
        ctx.fillText(group.label, (x1 + x2) / 2, textY);
      }
    }

    ctx.restore();
  },
};
