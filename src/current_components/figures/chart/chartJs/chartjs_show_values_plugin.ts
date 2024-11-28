import { ChartType, Plugin } from "chart.js";
import { computeTextWidth } from "../../../../helpers";
import {
  TREND_LINE_XAXIS_ID,
  chartFontColor,
} from "../../../../helpers/figures/charts/chart_common";
import { Color } from "../../../../types";

export interface ChartShowValuesPluginOptions {
  showValues: boolean;
  background?: Color;
  horizontal?: boolean;
  callback: (value: number | string, axisId?: string) => string;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartShowValuesPlugin?: ChartShowValuesPluginOptions;
  }
}

/** This is a chartJS plugin that will draw the values of each data next to the point/bar/pie slice */
export const chartShowValuesPlugin: Plugin = {
  id: "chartShowValuesPlugin",
  afterDatasetsDraw(chart: any, args, options: ChartShowValuesPluginOptions) {
    if (!options.showValues) {
      return;
    }
    const drawData = chart._metasets?.[0]?.data;
    if (!drawData) {
      return;
    }
    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.miterLimit = 1; // Avoid sharp artifacts on strokeText

    switch (chart.config.type) {
      case "pie":
      case "doughnut":
        drawPieChartValues(chart, options, ctx);
        break;
      case "bar":
      case "line":
      case "radar":
        options.horizontal
          ? drawHorizontalBarChartValues(chart, options, ctx)
          : drawLineOrBarOrRadarChartValues(chart, options, ctx);
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

function drawLineOrBarOrRadarChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;
  const textsPositions: Record<number, number[]> = {};

  for (const dataset of chart._metasets) {
    if (dataset.xAxisID === TREND_LINE_XAXIS_ID) {
      return; // ignore trend lines
    }

    for (let i = 0; i < dataset._parsed.length; i++) {
      const parsedValue = dataset._parsed[i];
      const value = Number(chart.config.type === "radar" ? parsedValue.r : parsedValue.y);
      if (isNaN(value)) {
        continue;
      }

      const axisId = chart.config.type === "radar" ? dataset.rAxisID : dataset.yAxisID;
      const displayValue = options.callback(Number(value), axisId);

      const point = dataset.data[i];
      const xPosition = point.x;

      let yPosition = 0;
      if (chart.config.type === "line" || chart.config.type === "radar") {
        yPosition = point.y - 10;
      } else {
        yPosition = value < 0 ? point.y - point.height / 2 : point.y + point.height / 2;
      }
      yPosition = Math.min(yPosition, yMax);
      yPosition = Math.max(yPosition, yMin);

      // Avoid overlapping texts with same X
      if (!textsPositions[xPosition]) {
        textsPositions[xPosition] = [];
      }
      for (const otherPosition of textsPositions[xPosition] || []) {
        if (Math.abs(otherPosition - yPosition) < 13) {
          yPosition = otherPosition - 13;
        }
      }
      textsPositions[xPosition].push(yPosition);

      ctx.fillStyle = point.options.backgroundColor;
      ctx.strokeStyle = options.background || "#ffffff";
      drawTextWithBackground(displayValue, xPosition, yPosition, ctx);
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
  const textsPositions: Record<number, number[]> = {};

  for (const dataset of chart._metasets) {
    if (dataset.xAxisID === TREND_LINE_XAXIS_ID) {
      return; // ignore trend lines
    }

    for (let i = 0; i < dataset._parsed.length; i++) {
      const value = Number(dataset._parsed[i].x);
      if (isNaN(value)) {
        continue;
      }
      const displayValue = options.callback(value, dataset.xAxisID);
      const point = dataset.data[i];

      const yPosition = point.y;
      let xPosition = value < 0 ? point.x + point.width / 2 : point.x - point.width / 2;
      xPosition = Math.min(xPosition, xMax);
      xPosition = Math.max(xPosition, xMin);

      // Avoid overlapping texts with same Y
      if (!textsPositions[yPosition]) {
        textsPositions[yPosition] = [];
      }
      const textWidth = computeTextWidth(ctx, displayValue, { fontSize: 12 }, "px");
      for (const otherPosition of textsPositions[yPosition]) {
        if (Math.abs(otherPosition - xPosition) < textWidth) {
          xPosition = otherPosition + textWidth + 3;
        }
      }
      textsPositions[yPosition].push(xPosition);

      ctx.fillStyle = point.options.backgroundColor;
      ctx.strokeStyle = options.background || "#ffffff";
      drawTextWithBackground(displayValue, xPosition, yPosition, ctx);
    }
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
      const y = bar.y + midRadius * Math.sin(midAngle) + 7;

      ctx.fillStyle = chartFontColor(options.background);
      ctx.strokeStyle = options.background || "#ffffff";

      const displayValue = options.callback(value);
      drawTextWithBackground(displayValue, x, y, ctx);
    }
  }
}
