import type { Chart, ChartType, Plugin } from "chart.js";
import { clipTextWithEllipsis, getDefaultContextFont } from "../../../../helpers/text_helper";
import { Color } from "../../../../types/misc";
/**
 * Size (in px) reserved beyond the category axis for each extra label level.
 * Includes room for the bracket line, notches and text.
 */
const LEVEL_SIZE = 22;
const BASE_PADDING = 10;
const LINE_MARGIN = 3;
const TEXT_MARGIN = 2;
/** Size of the bracket notches, perpendicular to the category axis. */
const NOTCH_SIZE = 5;
/** Space, along the category axis, so brackets don't touch the bar edges. */
const BRACKET_SPACE = 2;
const MIN_TEXT_SIZE = 6;
const FONT_SIZE = 11;

export interface ChartGroupedLabelsPluginOptions {
  enabled: boolean;
  fontColor: Color;
  parentCategories?: string[][];
  indexAxis?: "x" | "y";
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

interface LabelHitBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  label: string;
}

const chartLabelHitBoxes = new WeakMap<Chart, LabelHitBox[]>();

export function findGroups(labels: string[]): LabelGroup[] {
  const groups: LabelGroup[] = [];
  let current: LabelGroup | null = null;

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    // An empty cell continues the current group (same hierarchy level, blank = "same as above")
    if (current && label === current.label) {
      current.end = i;
    } else {
      if (current) {
        groups.push(current);
      }
      current = { start: i, end: i, label };
    }
  }
  if (current) {
    groups.push(current);
  }
  return groups;
}

/**
 * Chart.js plugin that draws bracket-style group indicators next to the category axis
 * when labels are multi-dimensional arrays (i.e., when multiple label ranges
 * are used, typically after converting from a treemap / sunburst chart).
 *
 * Example (2-level labels – leaf first, root last):
 *
 *     Q1    Q2    Q3    Q1    Q2    Q3
 *   └─────────────────┴─────────────────┘
 *         2024                2025
 */
export const chartGroupedLabelsPlugin: Plugin = {
  id: "chartGroupedLabelsPlugin",

  beforeLayout(chart: Chart, _args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const numLevels = options.parentCategories?.length ?? 0;
    if (numLevels <= 0) {
      return;
    }
    const side = options.indexAxis === "y" ? "left" : "bottom";
    chart.options.layout!.padding![side] = BASE_PADDING + numLevels * LEVEL_SIZE;
  },

  afterDraw(chart: Chart, _args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const parentCategories = options.parentCategories;
    if (!parentCategories || parentCategories.length === 0) {
      return;
    }

    const isHorizontal = options.indexAxis === "y";
    const scale = isHorizontal ? chart.scales.y : chart.scales.x;
    if (!scale || scale.type === "time" || scale.type === "linear") {
      return;
    }

    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = options.fontColor;
    ctx.fillStyle = options.fontColor;
    ctx.font = getDefaultContextFont(FONT_SIZE);
    ctx.textAlign = "center";

    const minTick = Math.ceil(scale.min);
    const maxTick = Math.floor(scale.max);
    const lowPixelEdge = isHorizontal ? scale.top : scale.left;
    const highPixelEdge = isHorizontal ? scale.bottom : scale.right;
    const indexIncreasesWithPixel =
      scale.getPixelForValue(minTick) <= scale.getPixelForValue(maxTick);
    const outerEdgeForStart = indexIncreasesWithPixel ? lowPixelEdge : highPixelEdge;
    const outerEdgeForEnd = indexIncreasesWithPixel ? highPixelEdge : lowPixelEdge;

    const hitBoxes: LabelHitBox[] = [];

    for (let level = 0; level < parentCategories.length; level++) {
      const groups = findGroups(parentCategories[level]);

      for (const group of groups) {
        if (group.end < minTick || group.start > maxTick) {
          continue;
        }
        if (!group.label) {
          continue;
        }

        const edgeStart =
          group.start <= minTick
            ? outerEdgeForStart
            : (scale.getPixelForValue(group.start - 1) + scale.getPixelForValue(group.start)) / 2;

        const edgeEnd =
          group.end >= maxTick
            ? outerEdgeForEnd
            : (scale.getPixelForValue(group.end) + scale.getPixelForValue(group.end + 1)) / 2;

        const start = Math.min(edgeStart, edgeEnd) + BRACKET_SPACE;
        const end = Math.max(edgeStart, edgeEnd) - BRACKET_SPACE;
        const availableSize = end - start - 2 * TEXT_MARGIN;
        if (availableSize < MIN_TEXT_SIZE) {
          continue;
        }
        const displayLabel = clipTextWithEllipsis(ctx, group.label, availableSize);

        if (isHorizontal) {
          const right = scale.left - LINE_MARGIN - level * LEVEL_SIZE;
          const lineX = right - NOTCH_SIZE;
          const textX = lineX - TEXT_MARGIN;

          ctx.beginPath();
          ctx.moveTo(right, start);
          ctx.lineTo(lineX, start);
          ctx.lineTo(lineX, end);
          ctx.lineTo(right, end);
          ctx.stroke();

          const midY = (start + end) / 2;
          ctx.save();
          ctx.translate(textX, midY);
          ctx.rotate(-Math.PI / 2);
          ctx.textBaseline = "bottom";
          ctx.fillText(displayLabel, 0, 0);
          ctx.restore();

          hitBoxes.push({
            left: textX - FONT_SIZE - TEXT_MARGIN,
            right,
            top: start,
            bottom: end,
            label: group.label,
          });
        } else {
          const top = scale.bottom + LINE_MARGIN + level * LEVEL_SIZE;
          const lineY = top + NOTCH_SIZE;
          const textY = lineY + TEXT_MARGIN;

          ctx.beginPath();
          ctx.moveTo(start, top);
          ctx.lineTo(start, lineY);
          ctx.lineTo(end, lineY);
          ctx.lineTo(end, top);
          ctx.stroke();

          ctx.textBaseline = "top";
          ctx.fillText(displayLabel, (start + end) / 2, textY);

          hitBoxes.push({
            left: start,
            right: end,
            top,
            bottom: textY + FONT_SIZE + TEXT_MARGIN,
            label: group.label,
          });
        }
      }
    }
    ctx.restore();
    chartLabelHitBoxes.set(chart, hitBoxes);
  },

  afterEvent(chart: Chart, args, options: ChartGroupedLabelsPluginOptions) {
    if (!options?.enabled) {
      return;
    }
    const event = args.event;
    if (event.type !== "mousemove" && event.type !== "mouseout") {
      return;
    }
    const hitBoxes = chartLabelHitBoxes.get(chart);
    if (!hitBoxes?.length) {
      return;
    }
    const x = event.x ?? 0;
    const y = event.y ?? 0;
    const hovered = hitBoxes.find(
      (box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
    );
    chart.canvas.title = hovered ? hovered.label : "";
  },
};
