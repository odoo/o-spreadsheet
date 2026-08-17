<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645
import type { Chart, ChartMeta, ChartType, Plugin, PointElement } from "chart.js";
import { colorToRGBA } from "../../../../helpers/color";
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
import type { ChartMeta, ChartType, Plugin } from "chart.js";
import { hexToHSLA, toHex } from "../../../../helpers/color";
=======
import type { ChartMeta, ChartType, Plugin, PointElement } from "chart.js";
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
import { chartFontColor, isTrendLineAxis } from "../../../../helpers/figures/charts/chart_common";
<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645
import { computeCachedTextDimension, computeTextFont } from "../../../../helpers/text_helper";
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
import { computeTextWidth } from "../../../../helpers/text_helper";
=======
import {
  computeCachedTextDimension,
  computeTextFont,
  computeTextWidth,
} from "../../../../helpers/text_helper";
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
import type { ChartType as AllChartType } from "../../../../types/chart/chart";
import { Color } from "../../../../types/misc";

interface Dimensions {
  width: number;
  height: number;
}

interface TextStyle {
  strokeColor?: string;
  textColor: string;
}

interface CallbackArgs {
  // Typed as any because we use private chart js properties which are not in the public types
  dataset: any;
  chartElement: any;
  numberValue: number;
  valueIndex: number;
  textSize: Dimensions;
  options: ChartShowValuesPluginOptions;
  chart: Chart;
}

export interface ChartShowValuesPluginOptions {
  type: AllChartType;
  showValues: boolean;
  background: (value: number | string, dataset: ChartMeta, index: number) => Color | undefined;
  horizontal?: boolean;
  callback: (value: number | string, dataset: ChartMeta, index: number) => string;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartShowValuesPlugin?: ChartShowValuesPluginOptions;
  }
}

const MINIMAL_VERTICAL_DISTANCE = 13;
const HORIZONTAL_PADDING = 3;

function isLineOverlayOnBarChart(
  options: ChartShowValuesPluginOptions,
  dataset: ChartMeta
): boolean {
  return options.type === "bar" && dataset.type === "line";
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

    switch (options.type) {
      case "pie":
        drawPieValues(chart, options);
        break;
      case "line":
      case "scatter":
        drawLineValues(chart, options);
        break;
      case "combo":
      case "waterfall":
        drawComboValues(chart, options);
        break;
      case "radar":
        drawRadarValues(chart, options);
        break;
      case "bar":
        options.horizontal
          ? drawHorizontalBarValues(chart, options)
          : drawVerticalBarValues(chart, options);
        break;
      case "pyramid":
        drawHorizontalBarValues(chart, options);
        break;
      case "calendar":
        drawCalendarValues(chart, options);
        break;
      case "bubble":
        drawBubbleValues(chart, options);
        break;
      case "funnel":
        drawFunnelValues(chart, options);
        break;
    }
  },
};

function drawValues(args: {
  chart: any;
  options: ChartShowValuesPluginOptions;
  direction: "horizontal" | "vertical";
  getNumberValue: (dataset: any, valueIndex: number) => number | undefined;
  getValuePosition: (args: CallbackArgs) => { x: number; y: number };
  shouldSkipValue: (args: CallbackArgs) => boolean;
  getTextColors: (args: CallbackArgs) => TextStyle;
}) {
  const { chart, options, getNumberValue, direction } = args;
  const ctx = chart.ctx as CanvasRenderingContext2D;
  ctx.save();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.miterLimit = 1; // Avoid sharp artifacts on strokeText

  const textsPositions: Record<number, number[]> = {};
  for (const dataset of chart._metasets) {
    if (isTrendLineAxis(dataset.xAxisID) || dataset.hidden) {
      continue;
    }

    for (let i = 0; i < dataset._parsed.length; i++) {
      const numberValue = getNumberValue(dataset, i);
      if (numberValue === undefined || isNaN(numberValue)) {
        continue;
      }
      const chartElement = dataset.data[i]; // BarElement, PointElement or ArcElement depending on the chart type

      // Elements are transparent only when hovering a legend item, so we don't want to show the value in that case
      const elementColor = chartElement.options.backgroundColor;
      if (!elementColor || colorToRGBA(elementColor).a !== 1) {
        continue;
      }

      const valueToDisplay = options.callback(numberValue, dataset, i);
      const textSize = getTextDimensions(valueToDisplay, ctx);
      const callbackArgs = {
        dataset,
        chartElement,
        numberValue,
        valueIndex: i,
        textSize,
        options,
        chart,
      };

<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645
      const position = args.getValuePosition(callbackArgs);
      if (args.shouldSkipValue?.(callbackArgs)) {
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
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

function drawBubbleChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;
  const textsPositions: Record<number, number[]> = {};

  for (const dataset of chart._metasets) {
    for (let i = 0; i < dataset._parsed.length; i++) {
      const parsedValue = dataset._parsed[i];
      const value = parsedValue.y;
      if (isNaN(value)) {
=======
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

function drawBubbleChartValues(
  chart: any,
  options: ChartShowValuesPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const yMax = chart.chartArea.bottom;
  const yMin = chart.chartArea.top;
  const textsPositions: Record<number, number[]> = {};

  const canDrawTextInsideBubble = (chartElement: PointElement, textSize: { height: number }) => {
    const radius =
      chartElement.options.radius ?? globalThis.Chart?.defaults.elements.point.radius ?? 3;
    // Only compare the height; The goal is to make sure the text doesn't totally hide the point, not to avoid any overflow
    return textSize.height < radius * 2;
  };

  for (const dataset of chart._metasets) {
    for (let i = 0; i < dataset._parsed.length; i++) {
      const parsedValue = dataset._parsed[i];
      const value = parsedValue.y;
      if (isNaN(value)) {
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
        continue;
      }
      const valueToDisplay = options.callback(Number(value), dataset, i);

<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645
      if (direction === "vertical") {
        const key = Math.round(position.x);
        // Avoid overlapping texts with same X
        if (!textsPositions[key]) {
          textsPositions[key] = [];
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
      const point = dataset.data[i];
      const xPosition = point.x;
      let yPosition = Math.max(Math.min(point.y, yMax), yMin);

      // Avoid overlapping texts with same X
      if (!textsPositions[xPosition]) {
        textsPositions[xPosition] = [];
      }
      for (const otherPosition of textsPositions[xPosition] || []) {
        if (Math.abs(otherPosition - yPosition) < MINIMAL_VERTICAL_DISTANCE) {
          yPosition = otherPosition + MINIMAL_VERTICAL_DISTANCE * (value < 0 ? 1 : -1);
=======
      const point = dataset.data[i];
      const xPosition = point.x;
      let yPosition = Math.max(Math.min(point.y, yMax), yMin);
      const textSize = getTextDimensions(valueToDisplay, ctx);
      if (!canDrawTextInsideBubble(point, textSize)) {
        yPosition = value < 0 ? point.y + 10 : point.y - 10;
      }

      // Avoid overlapping texts with same X
      if (!textsPositions[xPosition]) {
        textsPositions[xPosition] = [];
      }
      for (const otherPosition of textsPositions[xPosition] || []) {
        if (Math.abs(otherPosition - yPosition) < MINIMAL_VERTICAL_DISTANCE) {
          yPosition = otherPosition + MINIMAL_VERTICAL_DISTANCE * (value < 0 ? 1 : -1);
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
        }
<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645
        for (const otherPosition of textsPositions[key] || []) {
          if (Math.abs(otherPosition - position.y) < MINIMAL_VERTICAL_DISTANCE) {
            position.y = otherPosition + MINIMAL_VERTICAL_DISTANCE * (numberValue < 0 ? 1 : -1);
          }
        }
        textsPositions[key].push(position.y);
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
      }
      textsPositions[xPosition].push(yPosition);
      const color = point.options.backgroundColor ?? "#ffffff";
      const hsla = hexToHSLA(toHex(color));
      if (hsla.a === 1) {
        ctx.fillStyle = chartFontColor(color);
=======
      }
      textsPositions[xPosition].push(yPosition);

      if (canDrawTextInsideBubble(point, textSize)) {
        ctx.strokeStyle = point.options.backgroundColor;
        ctx.fillStyle = options.background(Number(value), dataset, i) || "#ffffff";
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
      } else {
<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645
        const key = Math.round(position.y);
        // Avoid overlapping texts with same Y
        if (!textsPositions[key]) {
          textsPositions[key] = [];
        }
        for (const otherPosition of textsPositions[key]) {
          if (Math.abs(otherPosition - position.x) < textSize.width) {
            position.x =
              numberValue < 0
                ? otherPosition - textSize.width - HORIZONTAL_PADDING
                : otherPosition + textSize.width + HORIZONTAL_PADDING;
          }
        }
        textsPositions[key].push(position.x);
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
        ctx.fillStyle = "#000000";
=======
        ctx.strokeStyle = options.background(Number(value), dataset, i) || "#ffffff";
        ctx.fillStyle = point.options.backgroundColor;
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
      }
<<<<<<< d72cc0bc38db22968f3f9cfde82eb0f1a2725645

      const { strokeColor, textColor } = args.getTextColors(callbackArgs);
      if (!!strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3; // Stroke the text with a big lineWidth width to have some kind of background
        ctx.strokeText(valueToDisplay, position.x, position.y);
      }
      ctx.fillStyle = textColor;
      ctx.lineWidth = 1;
      ctx.fillText(valueToDisplay, position.x, position.y);
||||||| 0646064cc2847215892e396c0539c7e9df7d951e
      const valueToDisplay = options.callback(Number(value), dataset, i);
      ctx.fillText(valueToDisplay, xPosition, yPosition);
=======
      drawTextWithBackground(valueToDisplay, xPosition, yPosition, ctx);
>>>>>>> cdfff905fcc0fd29c3a9540ccb7c025b17e045f7
    }
  }

  ctx.restore();
}

function drawVerticalBarValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => Number(dataset._parsed[i].y),
    getValuePosition: getVerticalBarValuePosition,
    shouldSkipValue: ({ dataset }) => isLineOverlayOnBarChart(options, dataset),
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
  });
}

function drawRadarValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => Number(dataset._parsed[i].r),
    getValuePosition: ({ chartElement }) => ({
      x: chartElement.x,
      y: chartElement.y - 10,
    }),
    shouldSkipValue: () => false,
    getTextColors: chartElementColoredTextWithChartBackgroundHalo,
  });
}

function drawLineValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => Number(dataset._parsed[i].y),
    getValuePosition: ({ chartElement }) => ({
      x: chartElement.x,
      y: chartElement.y - 10,
    }),
    shouldSkipValue: () => false,
    getTextColors: chartElementColoredTextWithChartBackgroundHalo,
  });
}

function drawComboValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => Number(dataset._parsed[i].y),
    getValuePosition: (args) =>
      args.dataset.type === "line"
        ? { x: args.chartElement.x, y: args.chartElement.y - 10 }
        : getVerticalBarValuePosition(args),
    shouldSkipValue: () => false,
    getTextColors: (args) =>
      args.dataset.type === "line"
        ? chartElementColoredTextWithChartBackgroundHalo(args)
        : chartBackgroundColoredTextWithElementColoredHalo(args),
  });
}

function drawCalendarValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => dataset._parsed[i].y,
    getValuePosition: ({ chartElement }) => ({
      x: chartElement.x,
      y: chartElement.y + chartElement.height / 2,
    }),
    shouldSkipValue: ({ chartElement, textSize }) =>
      textSize.height + 2 > Math.abs(chartElement.height) - 2,
    getTextColors: ({ chartElement }) => ({
      strokeColor: undefined,
      textColor: chartFontColor(chartElement.options.backgroundColor),
    }),
  });
}

function drawBubbleValues(chart: any, options: ChartShowValuesPluginOptions) {
  const canDrawTextInsideBubble = (chartElement: PointElement, textSize: Dimensions) => {
    const radius =
      chartElement.options.radius ?? globalThis.Chart?.defaults.elements.point.radius ?? 3;
    // Only compare the height; The goal is to make sure the text doesn't totally hide the point, not to avoid any overflow
    return textSize.height < radius * 2;
  };
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => dataset._parsed[i].y,
    getValuePosition: ({ chartElement, textSize }) => ({
      x: chartElement.x,
      y: canDrawTextInsideBubble(chartElement, textSize) ? chartElement.y : chartElement.y - 10,
    }),
    shouldSkipValue: () => false,
    getTextColors: (args: CallbackArgs) => {
      return canDrawTextInsideBubble(args.chartElement, args.textSize)
        ? chartBackgroundColoredTextWithElementColoredHalo(args)
        : chartElementColoredTextWithChartBackgroundHalo(args);
    },
  });
}

function drawHorizontalBarValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "horizontal",
    getNumberValue: (dataset, i) => dataset._parsed[i].x,
    getValuePosition: ({ chartElement, numberValue, textSize, dataset }) => {
      const xAxisScale = chart.scales[dataset.xAxisID];
      const xZeroLine = xAxisScale.getPixelForValue(0);
      const distanceFromAxisOrigin = Math.abs(chartElement.x - xZeroLine);
      let xPosition: number;
      const sign = numberValue < 0 ? -1 : 1;
      if (distanceFromAxisOrigin < textSize.width) {
        xPosition = xZeroLine + sign * (textSize.width / 2 + HORIZONTAL_PADDING);
      } else {
        xPosition = chartElement.x - sign * (chartElement.width / 2);
      }
      return {
        x: xPosition,
        y: chartElement.y,
      };
    },
    shouldSkipValue: ({ dataset }) => isLineOverlayOnBarChart(options, dataset),
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
  });
}

function drawFunnelValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "horizontal",
    getNumberValue: (dataset, i) => dataset._parsed[i].x,
    getValuePosition: ({ chartElement }) => ({
      x: chartElement.x - chartElement.width / 2,
      y: chartElement.y,
    }),
    shouldSkipValue: () => false,
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
  });
}

function drawPieValues(chart: any, options: ChartShowValuesPluginOptions) {
  const getSliceDimensions = (chartElement: any) => {
    const { startAngle, endAngle, innerRadius, outerRadius } = chartElement;
    const midAngle = (startAngle + endAngle) / 2;
    const midRadius = (innerRadius + outerRadius) / 2;
    return { midAngle, midRadius };
  };
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => Number(dataset._parsed[i]),
    getValuePosition: ({ chartElement }) => {
      const { midAngle, midRadius } = getSliceDimensions(chartElement);
      const x = chartElement.x + midRadius * Math.cos(midAngle);
      const y = chartElement.y + midRadius * Math.sin(midAngle);
      return { x, y };
    },
    shouldSkipValue: ({ chartElement, textSize }) => {
      const { midRadius } = getSliceDimensions(chartElement);
      const sliceAngle = chartElement.endAngle - chartElement.startAngle;
      const midWidth = 2 * midRadius * Math.tan(sliceAngle / 2);
      return sliceAngle < Math.PI / 2 && (textSize.width >= midWidth || midWidth < textSize.height);
    },
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
  });
}

function getTextDimensions(text: string, ctx: CanvasRenderingContext2D): Dimensions {
  const font = computeTextFont({ fontSize: globalThis.Chart?.defaults.font.size ?? 12 }, "px");
  return computeCachedTextDimension(ctx, text, font);
}

function chartBackgroundColoredTextWithElementColoredHalo(args: CallbackArgs) {
  const { dataset, numberValue, valueIndex, chartElement, options } = args;
  return {
    strokeColor: chartElement.options.backgroundColor,
    textColor: options.background(numberValue, dataset, valueIndex) || "#ffffff",
  };
}

function chartElementColoredTextWithChartBackgroundHalo(args: CallbackArgs) {
  const { dataset, numberValue, valueIndex, chartElement, options } = args;
  return {
    strokeColor: options.background(numberValue, dataset, valueIndex) || "#ffffff",
    textColor: chartElement.options.backgroundColor,
  };
}

function getVerticalBarValuePosition(args: CallbackArgs) {
  const { chartElement, numberValue, dataset, textSize, chart } = args;
  const yAxisScale = chart.scales[dataset.yAxisID];
  const yZeroLine = yAxisScale.getPixelForValue(0);
  const distanceFromAxisOrigin = Math.abs(yZeroLine - chartElement.y);

  const sign = numberValue < 0 ? -1 : 1;
  let yPosition = 0;
  if (distanceFromAxisOrigin < textSize.height) {
    yPosition = yZeroLine - sign * (textSize.height / 2);
  } else {
    yPosition = chartElement.y + sign * (chartElement.height / 2);
  }

  return { x: chartElement.x, y: yPosition };
}

function getTextDimensions(text: string, ctx: CanvasRenderingContext2D): { height: number } {
  const font = computeTextFont({ fontSize: globalThis.Chart?.defaults.font.size ?? 12 }, "px");
  return computeCachedTextDimension(ctx, text, font);
}
