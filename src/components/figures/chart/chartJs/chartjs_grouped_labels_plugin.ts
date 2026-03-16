import { clipTextWithEllipsis } from "@odoo/o-spreadsheet-engine/helpers/text_helper";
import type { Chart, ChartType, Plugin } from "chart.js";
import { Color } from "../../../../types";
/**
 * Height (in px) reserved below the x-axis for each extra label level.
 * Includes room for the bracket line, notches and text.
 */
const LEVEL_HEIGHT = 22;
const BASE_BOTTOM_PADDING = 10;
const LINE_MARGIN = 3;
const TEXT_MARGIN = 2;
/** Height of the vertical bracket notches. */
const NOTCH_SIZE = 5;
/** Horizontal inset so brackets don't touch the bar edges. */
const BRACKET_INSET = 2;
const MIN_TEXT_WIDTH = 6;

export interface ChartGroupedLabelsPluginOptions {
  enabled: boolean;
  fontColor: Color;
  secondaryLabels?: string[][];
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

function findGroups(labels: string[]): LabelGroup[] {
  const groups: LabelGroup[] = [];
  let current: LabelGroup | null = null;

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i] ?? "";
    if (label !== "") {
      if (current) {
        groups.push(current);
      }
      current = { start: i, end: i, label };
    } else if (current) {
      current.end = i;
    }
  }
  if (current) {
    groups.push(current);
  }
  return groups;
}

/**
 * Chart.js plugin that draws bracket-style group indicators below the x-axis
 * when labels are multi-dimensional arrays (i.e., when multiple label ranges
 * are used, typically after converting from a treemap / sunburst chart).
 *
 * For each secondary label level, it draws a horizontal line spanning every
 * bar/points that belongs to the same parent category, with short vertical
 * notches at both ends and the group name centered below the line.
 *
 * Example (2-level labels – leaf first, root last):
 *
 *     Q1    Q2    Q3    Q1    Q2    Q3
 *   └─────────────────┴─────────────────┘
 *         2024                2025
 */
export const chartGroupedLabelsPlugin: Plugin = {
  id: "chartGroupedLabelsPlugin",

  beforeLayout(chart: Chart, args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const numLevels = options.secondaryLabels?.length ?? 0;
    if (numLevels <= 0) {
      return;
    }
    chart.options.layout!.padding!["bottom"] = BASE_BOTTOM_PADDING + numLevels * LEVEL_HEIGHT;
  },

  afterDraw(chart: Chart, args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const secondaryLabels = options.secondaryLabels;
    if (!secondaryLabels || secondaryLabels.length === 0) {
      return;
    }

    const scale = chart.scales.x;
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

    // scale.min/max use fractional offsets for bar charts (e.g. -0.5 / 7.5),
    // so we round to get the first and last visible label indices.
    const minTick = Math.ceil(scale.min);
    const maxTick = Math.floor(scale.max);

    for (let level = 0; level < secondaryLabels.length; level++) {
      const groups = findGroups(secondaryLabels[level]);
      const notchTopY = scale.bottom + LINE_MARGIN + level * LEVEL_HEIGHT;
      const lineY = notchTopY + NOTCH_SIZE;
      const textY = lineY + TEXT_MARGIN;

      for (const group of groups) {
        if (group.end < minTick || group.start > maxTick) {
          continue;
        }

        const leftEdge =
          group.start <= minTick
            ? scale.left
            : Math.max(
                scale.left,
                (scale.getPixelForValue(group.start - 1) + scale.getPixelForValue(group.start)) / 2
              );

        const rightEdge =
          group.end >= maxTick
            ? scale.right
            : Math.min(
                scale.right,
                (scale.getPixelForValue(group.end) + scale.getPixelForValue(group.end + 1)) / 2
              );

        const x1 = leftEdge + BRACKET_INSET;
        const x2 = rightEdge - BRACKET_INSET;

        ctx.beginPath();
        ctx.moveTo(x1, notchTopY);
        ctx.lineTo(x1, lineY);
        ctx.lineTo(x2, lineY);
        ctx.lineTo(x2, notchTopY);
        ctx.stroke();
        const availableWidth = x2 - x1 - 2 * TEXT_MARGIN;
        if (availableWidth < MIN_TEXT_WIDTH) {
          continue;
        }
        const displayLabel = clipTextWithEllipsis(ctx, group.label, availableWidth);
        ctx.fillText(displayLabel, (x1 + x2) / 2, textY);
      }
    }
    ctx.restore();
  },
};
