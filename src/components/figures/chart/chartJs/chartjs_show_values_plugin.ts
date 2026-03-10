import {
  chartFontColor,
  isTrendLineAxis,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import type { ChartType as AllChartType } from "@odoo/o-spreadsheet-engine/types/chart";
import type { ChartMeta, ChartType, Plugin } from "chart.js";
import { computeTextWidth } from "../../../../helpers";
import { Color } from "../../../../types";

export interface ChartShowValuesPluginOptions {
  type: AllChartType;
  showValues: boolean;
  showTotals?: boolean;
  background: (value: number | string, dataset: ChartMeta, index: number) => Color | undefined;
  horizontal?: boolean;
  callback: (value: number | string, dataset: ChartMeta, index: number) => string;
}

type StackedTotalLabel = {
  totalValue: number;
  xPosition: number;
  yPosition: number;
  dataset: ChartMeta;
  dataPointIndex: number;
};

const LABEL_PADDING = 3;
const LABEL_MIN_SPACING = 13;

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartShowValuesPlugin?: ChartShowValuesPluginOptions;
  }
}

/** This is a chartJS plugin that will draw the values of each data next to the point/bar/pie slice */
export const chartShowValuesPlugin: Plugin = {
  id: "chartShowValuesPlugin",
  afterDatasetsDraw(chart: any, args, options: ChartShowValuesPluginOptions) {
    if (!options.showValues && !options.showTotals) {
      return;
    }
    const drawData = chart._metasets?.[0]?.data;
    if (!drawData) {
      return;
    }
    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();
    const { left, top, height, width } = chart.chartArea;
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();

    setupDrawTextContext(ctx);

    switch (options.type) {
      case "pie":
        drawPieChartValues(chart, options, ctx);
        break;
      case "line":
      case "scatter":
      case "combo":
      case "waterfall":
      case "radar":
        drawLineOrBarOrRadarChartValues(chart, options, ctx);
        break;
      case "bar":
        options.horizontal
          ? drawHorizontalBarChartValues(chart, options, ctx)
          : drawLineOrBarOrRadarChartValues(chart, options, ctx);
        break;
      case "pyramid":
        drawHorizontalBarChartValues(chart, options, ctx);
        break;
      case "calendar":
        drawBarChartValues(chart, options, ctx);
        break;
      case "funnel":
        drawHorizontalBarChartValues(chart, options, ctx);
        break;
    }

    ctx.restore();
  },
};

function drawTextWithBackground(text: string, x: number, y: number, ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 3; // Stroke the text with a big lineWidth width to have some kind of background
  ctx.strokeText(text, x, y);
  ctx.lineWidth = 1;
  ctx.fillText(text, x, y);
}

function setupDrawTextContext(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.miterLimit = 1; // Avoid sharp artifacts on strokeText
}

// Value labels should stay clipped to the plot area, but totals may extend above/right of it.
// Restoring here removes the chartArea clip before the totals pass.
function restoreContextForTotals(ctx: CanvasRenderingContext2D) {
  ctx.restore();
  ctx.save();
  setupDrawTextContext(ctx);
}

function drawLineOrBarOrRadarChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;
  const textHeight = globalThis.Chart?.defaults.font.size ?? 12; // ChartJS default text height
  const textsPositions: Record<number, number[]> = {};
  const stackedTotalsByIndex = new Map<number, StackedTotalLabel>();
  for (const dataset of chart._metasets) {
    if (isTrendLineAxis(dataset.xAxisID) || dataset.hidden) {
      continue;
    }

    const yAxisScale = chart.scales[dataset.yAxisID];
    const yZeroLine = yAxisScale.getPixelForValue(0);
    for (let i = 0; i < dataset._parsed.length; i++) {
      const parsedValue = dataset._parsed[i];
      const value = Number(chart.config.type === "radar" ? parsedValue.r : parsedValue.y);
      if (isNaN(value)) {
        continue;
      }
      const point = dataset.data[i];
      const xPosition = point.x;

      // Collect one total per stacked category while we already loop over the bars.
      if (dataset.type === "bar" && options.showTotals) {
        if (!stackedTotalsByIndex.has(i)) {
          stackedTotalsByIndex.set(i, {
            totalValue: 0,
            xPosition,
            yPosition: yZeroLine,
            dataset,
            dataPointIndex: i,
          });
        }
        const total = stackedTotalsByIndex.get(i)!;
        total.totalValue += value;
        if (value > 0 && point.y < total.yPosition) {
          total.yPosition = point.y;
        }
      }

      if (!options.showValues) {
        continue;
      }

      let yPosition = 0;
      if (chart.config.type === "line" || chart.config.type === "radar") {
        yPosition = value < 0 ? point.y + 10 : point.y - 10;
      } else {
        const distanceFromAxisOrigin = Math.abs(yZeroLine - point.y);

        if (distanceFromAxisOrigin < textHeight) {
          yPosition = value < 0 ? yZeroLine + textHeight / 2 : yZeroLine - textHeight / 2;
        } else {
          yPosition = value < 0 ? point.y - point.height / 2 : point.y + point.height / 2;
        }
      }

      yPosition = Math.min(yPosition, yMax);
      yPosition = Math.max(yPosition, yMin);

      // Avoid overlapping texts with same X
      if (!textsPositions[xPosition]) {
        textsPositions[xPosition] = [];
      }
      for (const otherPosition of textsPositions[xPosition] || []) {
        if (Math.abs(otherPosition - yPosition) < LABEL_MIN_SPACING) {
          yPosition =
            value < 0 ? otherPosition + LABEL_MIN_SPACING : otherPosition - LABEL_MIN_SPACING;
        }
      }
      textsPositions[xPosition].push(yPosition);

      ctx.fillStyle = point.options.backgroundColor;
      ctx.strokeStyle = options.background(Number(value), dataset, i) || "#ffffff";
      const valueToDisplay = options.callback(Number(value), dataset, i);
      drawTextWithBackground(valueToDisplay, xPosition, yPosition, ctx);
    }
  }

  if (!options.showTotals) {
    return;
  }

  restoreContextForTotals(ctx);

  // Reuse textsPositions so totals do not overlap with already drawn value labels.
  for (const total of stackedTotalsByIndex.values()) {
    const xPosition = total.xPosition;
    let yPosition = total.yPosition - textHeight / 2 - LABEL_PADDING;
    yPosition = Math.min(yPosition, yMax);
    yPosition = Math.max(yPosition, yMin);

    if (!textsPositions[xPosition]) {
      textsPositions[xPosition] = [];
    }
    for (const otherPosition of textsPositions[xPosition]) {
      if (Math.abs(otherPosition - yPosition) < LABEL_MIN_SPACING) {
        yPosition = otherPosition - LABEL_MIN_SPACING;
      }
    }
    yPosition = Math.min(yPosition, yMax);
    yPosition = Math.max(yPosition, yMin);
    textsPositions[xPosition].push(yPosition);

    const background = options.background(total.totalValue, total.dataset, total.dataPointIndex);
    ctx.fillStyle = chartFontColor(background);
    ctx.strokeStyle = background || "#ffffff";
    const valueToDisplay = options.callback(total.totalValue, total.dataset, total.dataPointIndex);
    drawTextWithBackground(valueToDisplay, xPosition, yPosition, ctx);
  }
}

function drawBarChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;

  for (const dataset of chart._metasets) {
    if (isTrendLineAxis(dataset.xAxisID) || dataset.hidden) {
      continue;
    }

    const yAxisScale = chart.scales[dataset.yAxisID];
    for (let i = 0; i < dataset._parsed.length; i++) {
      const parsedValue = dataset._parsed[i];
      const value = Number(chart.config.type === "radar" ? parsedValue.r : parsedValue.y);
      if (isNaN(value)) {
        continue;
      }

      const point = dataset.data[i];
      const xPosition = point.x;

      let yPosition = 0;
      const yZeroLine = yAxisScale.getPixelForValue(0);
      const distanceFromAxisOrigin = Math.abs(yZeroLine - point.y);
      const textHeight = globalThis.Chart?.defaults.font.size ?? 12; // ChartJS default text height

      if (distanceFromAxisOrigin < textHeight) {
        yPosition = value < 0 ? yZeroLine + textHeight / 2 : yZeroLine - textHeight / 2;
      } else {
        yPosition = value < 0 ? point.y - point.height / 2 : point.y + point.height / 2;
      }

      yPosition = Math.min(yPosition, yMax);
      yPosition = Math.max(yPosition, yMin);

      ctx.strokeStyle = point.options.backgroundColor;
      ctx.fillStyle = options.background(Number(value), dataset, i) || "#ffffff";
      const valueToDisplay = options.callback(Number(value), dataset, i);
      const measures = ctx.measureText(valueToDisplay);
      const height = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
      if (height + 2 > Math.abs(point.height) - 2) {
        continue; // Skip drawing the value if there is not enough space in the bar
      }
      drawTextWithBackground(valueToDisplay, xPosition, yPosition, ctx);
    }
  }
}

function drawHorizontalBarChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const xMax = chart.chartArea.right;
  const xMin = chart.chartArea.left;
  const fontSize = globalThis.Chart?.defaults.font.size ?? 12; // ChartJS default text height
  const textsPositions: Record<number, number[]> = {};
  const stackedTotalsByIndex = new Map<number, StackedTotalLabel>();

  for (const dataset of chart._metasets) {
    if (isTrendLineAxis(dataset.xAxisID) || dataset.hidden) {
      continue;
    }
    const xAxisScale = chart.scales[dataset.xAxisID];
    const xZeroLine = xAxisScale.getPixelForValue(0);

    for (let i = 0; i < dataset._parsed.length; i++) {
      const value = Number(dataset._parsed[i].x);
      if (isNaN(value)) {
        continue;
      }
      const point = dataset.data[i];

      // Collect one total per stacked category while we already loop over the bars.
      if (options.showTotals) {
        if (!stackedTotalsByIndex.has(i)) {
          stackedTotalsByIndex.set(i, {
            totalValue: 0,
            xPosition: xZeroLine,
            yPosition: point.y,
            dataset,
            dataPointIndex: i,
          });
        }
        const total = stackedTotalsByIndex.get(i)!;
        total.totalValue += value;
        if (value > 0 && point.x > total.xPosition) {
          total.xPosition = point.x;
        }
      }

      if (!options.showValues) {
        continue;
      }

      const displayValue = options.callback(value, dataset, i);

      const yPosition = point.y;
      const textWidth = computeTextWidth(ctx, displayValue, { fontSize }, "px");
      const distanceFromAxisOrigin = Math.abs(point.x - xZeroLine);

      let xPosition: number;
      if (distanceFromAxisOrigin < textWidth) {
        xPosition =
          value < 0
            ? xZeroLine - textWidth / 2 - LABEL_PADDING
            : xZeroLine + textWidth / 2 + LABEL_PADDING;
      } else {
        xPosition = value < 0 ? point.x + point.width / 2 : point.x - point.width / 2;
        xPosition = Math.min(xPosition, xMax);
        xPosition = Math.max(xPosition, xMin);
      }

      // Avoid overlapping texts with same Y
      if (!textsPositions[yPosition]) {
        textsPositions[yPosition] = [];
      }
      for (const otherPosition of textsPositions[yPosition]) {
        if (Math.abs(otherPosition - xPosition) < textWidth) {
          xPosition =
            value < 0
              ? otherPosition - textWidth - LABEL_PADDING
              : otherPosition + textWidth + LABEL_PADDING;
        }
      }
      textsPositions[yPosition].push(xPosition);

      ctx.strokeStyle = point.options.backgroundColor;
      ctx.fillStyle = options.background(Number(value), dataset, i) || "#ffffff";
      drawTextWithBackground(displayValue, xPosition, yPosition, ctx);
    }
  }

  if (!options.showTotals) {
    return;
  }

  restoreContextForTotals(ctx);

  // Reuse textsPositions so totals do not overlap with already drawn value labels.
  for (const total of stackedTotalsByIndex.values()) {
    const yPosition = total.yPosition;
    const displayValue = options.callback(total.totalValue, total.dataset, total.dataPointIndex);
    const textWidth = computeTextWidth(ctx, displayValue, { fontSize }, "px");
    let xPosition = total.xPosition + textWidth / 2 + LABEL_PADDING;
    xPosition = Math.min(xPosition, xMax);
    xPosition = Math.max(xPosition, xMin);

    if (!textsPositions[yPosition]) {
      textsPositions[yPosition] = [];
    }
    for (const otherPosition of textsPositions[yPosition]) {
      if (Math.abs(otherPosition - xPosition) < textWidth) {
        xPosition = otherPosition + textWidth + LABEL_PADDING;
      }
    }
    xPosition = Math.min(xPosition, xMax);
    xPosition = Math.max(xPosition, xMin);
    textsPositions[yPosition].push(xPosition);

    const background = options.background(total.totalValue, total.dataset, total.dataPointIndex);
    ctx.fillStyle = chartFontColor(background);
    ctx.strokeStyle = background || "#ffffff";
    drawTextWithBackground(displayValue, xPosition, yPosition, ctx);
  }
}

function drawPieChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  for (const dataset of chart._metasets) {
    for (let i = 0; i < dataset._parsed.length; i++) {
      const value = Number(dataset._parsed[i]);
      if (isNaN(value) || value === 0) {
        continue;
      }
      const bar = dataset.data[i];
      const { startAngle, endAngle, innerRadius, outerRadius } = bar;
      const midAngle = (startAngle + endAngle) / 2;
      const midRadius = (innerRadius + outerRadius) / 2;
      const x = bar.x + midRadius * Math.cos(midAngle);
      const y = bar.y + midRadius * Math.sin(midAngle);
      const displayValue = options.callback(value, dataset, i);

      const textHeight = globalThis.Chart?.defaults.font.size ?? 12; // ChartJS default
      const textWidth = computeTextWidth(ctx, displayValue, { fontSize: textHeight }, "px");

      const radius = outerRadius - innerRadius;
      // Check if the text fits in the slice. Not perfect, but good enough heuristic.
      if (textWidth >= radius || radius < textHeight) {
        continue;
      }
      const sliceAngle = endAngle - startAngle;
      const midWidth = 2 * midRadius * Math.tan(sliceAngle / 2);
      if (sliceAngle < Math.PI / 2 && (textWidth >= midWidth || midWidth < textHeight)) {
        continue;
      }

      const background = options.background(Number(value), dataset, i);
      ctx.fillStyle = chartFontColor(background);
      ctx.strokeStyle = background || "#ffffff";

      drawTextWithBackground(displayValue, x, y, ctx);
    }
  }
}
