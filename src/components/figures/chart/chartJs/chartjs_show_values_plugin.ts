import { ChartType, Plugin } from "chart.js";
import { computeTextWidth } from "../../../../helpers";
import { chartFontColor } from "../../../../helpers/figures/charts/chart_common";
import { Color } from "../../../../types";

interface ChartShowValuesPluginOptions {
  showValues: boolean;
  background?: Color;
  horizontal?: boolean;
  callback: (value: number | string) => string;
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
        options.horizontal
          ? drawHorizontalBarChartValues(chart, options, ctx)
          : drawLineOrBarChartValues(chart, options, ctx);
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

function drawLineOrBarChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;
  const textsPositions: Record<number, number[]> = {};

  for (const dataset of chart._metasets) {
    for (let i = 0; i < dataset._parsed.length; i++) {
      const value = dataset._parsed[i].y;
      const point = dataset.data[i];

      const xPosition = point.x;

      let yPosition = 0;
      if (chart.config.type === "line") {
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
      drawTextWithBackground(options.callback(value - 0), xPosition, yPosition, ctx);
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
    for (let i = 0; i < dataset._parsed.length; i++) {
      const value = dataset._parsed[i].x;
      const displayValue = options.callback(value - 0);
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
      const bar = dataset.data[i];
      const { startAngle, endAngle, innerRadius, outerRadius } = bar;
      const midAngle = (startAngle + endAngle) / 2;
      const midRadius = (innerRadius + outerRadius) / 2;
      const x = bar.x + midRadius * Math.cos(midAngle);
      const y = bar.y + midRadius * Math.sin(midAngle) + 7;

      ctx.fillStyle = chartFontColor(options.background);
      ctx.strokeStyle = options.background || "#ffffff";

      const value = options.callback(dataset._parsed[i]);
      drawTextWithBackground(value, x, y, ctx);
    }
  }
}
