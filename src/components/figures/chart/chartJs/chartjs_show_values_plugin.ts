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
  stacked?: boolean;
  background: (value: number | string, dataset: ChartMeta, index: number) => Color | undefined;
  horizontal?: boolean;
  callback: (value: number | string, dataset: ChartMeta, index: number) => string;
}

interface StackedTotalRenderInfo {
  dataset: any;
  dataPointIndex: number;
  point: any;
  value: number;
  labelAxisPosition: number;
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
    if (!options.showValues && !options.showTotals) {
      return;
    }
    const drawData = chart._metasets?.[0]?.data;
    if (!drawData) {
      return;
    }
    const ctx = chart.ctx as CanvasRenderingContext2D;
    if (options.showValues) {
      ctx.save();
      clipChartArea(chart, ctx);
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
        case "funnel":
          drawHorizontalBarChartValues(chart, options, ctx);
          break;
        case "calendar":
          drawBarChartValues(chart, options, ctx);
          break;
      }
      ctx.restore();
    }

    if (options.showTotals) {
      ctx.save();
      setupDrawTextContext(ctx);
      drawStackedBarChartTotals(chart, options, ctx);
      ctx.restore();
    }
  },
};

function clipChartArea(chart: any, ctx: CanvasRenderingContext2D) {
  const { left, top, height, width } = chart.chartArea;
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
}

function setupDrawTextContext(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.miterLimit = 1; // Avoid sharp artifacts on strokeText
}

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
      if (chart.config.type === "line" || chart.config.type === "radar") {
        yPosition = value < 0 ? point.y + 10 : point.y - 10;
      } else {
        const yZeroLine = yAxisScale.getPixelForValue(0);
        const distanceFromAxisOrigin = Math.abs(yZeroLine - point.y);
        const textHeight = globalThis.Chart?.defaults.font.size ?? 12; // ChartJS default text height

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
        if (Math.abs(otherPosition - yPosition) < 13) {
          yPosition = value < 0 ? otherPosition + 13 : otherPosition - 13;
        }
      }
      textsPositions[xPosition].push(yPosition);

      ctx.fillStyle = point.options.backgroundColor;
      ctx.strokeStyle = options.background(Number(value), dataset, i) || "#ffffff";
      const valueToDisplay = options.callback(Number(value), dataset, i);
      drawTextWithBackground(valueToDisplay, xPosition, yPosition, ctx);
    }
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
  const textsPositions: Record<number, number[]> = {};

  for (const dataset of chart._metasets) {
    if (isTrendLineAxis(dataset.xAxisID)) {
      return; // ignore trend lines
    }
    const xAxisScale = chart.scales[dataset.xAxisID];
    const xZeroLine = xAxisScale.getPixelForValue(0);

    for (let i = 0; i < dataset._parsed.length; i++) {
      const value = Number(dataset._parsed[i].x);
      if (isNaN(value)) {
        continue;
      }
      const displayValue = options.callback(value, dataset, i);
      const point = dataset.data[i];

      const yPosition = point.y;
      const textWidth = computeTextWidth(
        ctx,
        displayValue,
        { fontSize: globalThis.Chart?.defaults.font.size ?? 12 },
        "px"
      );
      const distanceFromAxisOrigin = Math.abs(point.x - xZeroLine);

      const PADDING = 3;
      let xPosition: number;
      if (distanceFromAxisOrigin < textWidth) {
        xPosition =
          value < 0 ? xZeroLine - textWidth / 2 - PADDING : xZeroLine + textWidth / 2 + PADDING;
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
            value < 0 ? otherPosition - textWidth - PADDING : otherPosition + textWidth + PADDING;
        }
      }
      textsPositions[yPosition].push(xPosition);

      ctx.strokeStyle = point.options.backgroundColor;
      ctx.fillStyle = options.background(Number(value), dataset, i) || "#ffffff";
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

function drawStackedBarChartTotals(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const isHorizontal = !!options.horizontal && options.type === "bar";
  const textHeight = globalThis.Chart?.defaults.font.size ?? 12;

  const xMax = chart.chartArea.right;
  const xMin = chart.chartArea.left;
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;

  for (const total of getStackedChartTotals(chart, options)) {
    const displayValue = options.callback(total.value, total.dataset, total.dataPointIndex);
    const background = options.background(total.value, total.dataset, total.dataPointIndex);

    let xPosition = total.point.x;
    let yPosition = total.point.y;

    if (isHorizontal) {
      const textWidth = computeTextWidth(ctx, displayValue, { fontSize: textHeight }, "px");
      xPosition = total.labelAxisPosition + textWidth / 2 + 3;
      xPosition = Math.min(xPosition, xMax);
      xPosition = Math.max(xPosition, xMin);
    } else {
      yPosition = total.labelAxisPosition - textHeight / 2 - 3;
      yPosition = Math.min(yPosition, yMax);
      yPosition = Math.max(yPosition, yMin);
    }

    ctx.fillStyle = chartFontColor(background);
    ctx.strokeStyle = background || "#ffffff";
    drawTextWithBackground(displayValue, xPosition, yPosition, ctx);
  }
}

function getStackedChartTotals(
  chart: any,
  options: ChartShowValuesPluginOptions
): StackedTotalRenderInfo[] {
  const totalsByIndex = new Map<number, StackedTotalRenderInfo>();
  const isHorizontal = !!options.horizontal && options.type === "bar";

  for (const dataset of chart._metasets) {
    if (!shouldIncludeDatasetInTotals(dataset, options)) {
      continue;
    }

    const axisId = isHorizontal ? dataset.xAxisID : dataset.yAxisID;
    const axisScale = chart.scales[axisId];
    const zeroLine = axisScale.getPixelForValue(0);

    for (let dataPointIndex = 0; dataPointIndex < dataset._parsed.length; dataPointIndex++) {
      const point = dataset.data[dataPointIndex];
      const parsedValue = dataset._parsed[dataPointIndex];
      const value = Number(isHorizontal ? parsedValue?.x : parsedValue?.y);

      if (!point || isNaN(value)) {
        continue;
      }

      let total = totalsByIndex.get(dataPointIndex);
      if (!total) {
        total = {
          dataset,
          dataPointIndex,
          point,
          value: 0,
          labelAxisPosition: zeroLine,
        };
        totalsByIndex.set(dataPointIndex, total);
      }

      total.value += value;

      if (value > 0) {
        const pointAxisPosition = isHorizontal ? point.x : point.y;
        const shouldUpdateLabelAxisPosition = isHorizontal
          ? pointAxisPosition > total.labelAxisPosition
          : pointAxisPosition < total.labelAxisPosition;

        if (shouldUpdateLabelAxisPosition) {
          total.labelAxisPosition = pointAxisPosition;
        }
      }
    }
  }

  return [...totalsByIndex.values()];
}

function shouldIncludeDatasetInTotals(dataset: any, options: ChartShowValuesPluginOptions) {
  if (dataset.hidden || isTrendLineAxis(dataset.xAxisID)) {
    return false;
  }

  if (options.type === "combo") {
    return dataset.type === "bar";
  }

  return options.type === "bar" && !!options.stacked;
}
