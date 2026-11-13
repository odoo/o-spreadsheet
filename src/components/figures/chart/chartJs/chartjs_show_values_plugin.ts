import type { Chart, ChartMeta, ChartType, Plugin, PointElement } from "chart.js";
import { colorToRGBA } from "../../../../helpers/color";
import { chartFontColor, isTrendLineAxis } from "../../../../helpers/figures/charts/chart_common";
import { ChartShowValues } from "../../../../helpers/figures/charts/runtime/chartjs_show_values";
import {
  clipTextWithEllipsis,
  computeCachedTextDimension,
  computeTextFont,
} from "../../../../helpers/text_helper";
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
  display?: ChartShowValues;
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
    if (!options.display?.values && !options.display?.labels && !options.display?.percentages) {
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
      case "heatmap":
        drawColorGridValues(chart, options);
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
  getPercentage?: (dataset: any, valueIndex: number) => number | undefined;
  getValuePosition: (args: CallbackArgs) => { x: number; y: number; a?: number; w?: number };
  getLabel?: (chart: any, dataset: any, valueIndex: number) => string;
  shouldSkipValue: (args: CallbackArgs) => boolean;
  getTextColors: (args: CallbackArgs) => TextStyle;
}) {
  const { chart, options, getNumberValue, getLabel, getPercentage, direction } = args;
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
      const numberValue = options.display?.values ? getNumberValue(dataset, i) : undefined;
      const label = options.display?.labels ? getLabel?.(chart, dataset, i) : undefined;
      const percentage = options.display?.percentages ? getPercentage?.(dataset, i) : undefined;
      if (
        (numberValue === undefined || isNaN(numberValue)) &&
        !label &&
        (percentage === undefined || isNaN(percentage))
      ) {
        continue;
      }
      const chartElement = dataset.data[i]; // BarElement, PointElement or ArcElement depending on the chart type

      // Elements are transparent only when hovering a legend item, so we don't want to show the value in that case
      const elementColor = chartElement.options.backgroundColor;
      if (!elementColor || colorToRGBA(elementColor).a !== 1) {
        continue;
      }
      const valuesToDisplay: string[] = [];
      if (label) {
        valuesToDisplay.push(label);
      }
      let displayedValue = "";
      if (numberValue !== undefined && !isNaN(numberValue)) {
        displayedValue = options.callback(numberValue, dataset, i);
      }
      if (percentage !== undefined && !isNaN(percentage)) {
        displayedValue +=
          (displayedValue ? " (" : "") + `${percentage.toFixed(2)}%` + (displayedValue ? ")" : "");
      }
      if (displayedValue) {
        valuesToDisplay.push(displayedValue);
      }
      const textSize = getTextDimensions(valuesToDisplay, ctx);

      const value = numberValue ?? 0;
      const callbackArgs = {
        dataset,
        chartElement,
        numberValue: value,
        valueIndex: i,
        textSize,
        options,
        chart,
      };

      const position = args.getValuePosition(callbackArgs);
      if (args.shouldSkipValue?.(callbackArgs)) {
        continue;
      }

      if (direction === "vertical") {
        const key = Math.round(position.x);
        // Avoid overlapping texts with same X
        if (!textsPositions[key]) {
          textsPositions[key] = [];
        }
        for (const otherPosition of textsPositions[key] || []) {
          if (Math.abs(otherPosition - position.y) < MINIMAL_VERTICAL_DISTANCE) {
            position.y = otherPosition + MINIMAL_VERTICAL_DISTANCE * (value < 0 ? 1 : -1);
          }
        }
        textsPositions[key].push(position.y);
      } else {
        const key = Math.round(position.y);
        // Avoid overlapping texts with same Y
        if (!textsPositions[key]) {
          textsPositions[key] = [];
        }
        for (const otherPosition of textsPositions[key]) {
          if (Math.abs(otherPosition - position.x) < textSize.width) {
            position.x =
              value < 0
                ? otherPosition - textSize.width - HORIZONTAL_PADDING
                : otherPosition + textSize.width + HORIZONTAL_PADDING;
          }
        }
        textsPositions[key].push(position.x);
      }

      const { strokeColor, textColor } = args.getTextColors(callbackArgs);
      let { x, y, a, w } = position;
      ctx.save();
      ctx.translate(x, y);
      if (label === undefined && percentage === undefined) {
        a = 0;
      }
      if (a !== undefined) {
        if (a > Math.PI / 2) {
          a += Math.PI;
        }
        ctx.rotate(a);
        x = x * Math.cos(a) - y * Math.sin(a);
        y = x * Math.sin(a) + y * Math.cos(a);
      }
      if (w !== undefined) {
        for (const i in valuesToDisplay) {
          valuesToDisplay[i] = clipTextWithEllipsis(ctx, valuesToDisplay[i], w);
        }
      }
      if (!!strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3; // Stroke the text with a big lineWidth width to have some kind of background
        if (valuesToDisplay.length === 1) {
          ctx.strokeText(valuesToDisplay[0], 0, 0);
        } else if (valuesToDisplay.length === 2) {
          const height = textSize.height;
          ctx.strokeText(valuesToDisplay[0], 0, 0 - height / 4);
          ctx.strokeText(valuesToDisplay[1], 0, 0 + height / 4);
        }
      }
      ctx.fillStyle = textColor;
      ctx.lineWidth = 1;
      if (valuesToDisplay.length === 1) {
        ctx.fillText(valuesToDisplay[0], 0, 0);
      } else if (valuesToDisplay.length === 2) {
        const height = textSize.height;
        ctx.fillText(valuesToDisplay[0], 0, 0 - height / 4);
        ctx.fillText(valuesToDisplay[1], 0, 0 + height / 4);
      }
      ctx.restore();
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

function drawColorGridValues(chart: any, options: ChartShowValuesPluginOptions) {
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
    getPercentage: (dataset, i) => {
      const total = dataset._parsed.reduce((sum: number, value: number) => sum + Number(value), 0);
      return total === 0 ? 0 : (Number(dataset._parsed[i]) / total) * 100;
    },
    getValuePosition: ({ chartElement }) => {
      const { midAngle: a, midRadius } = getSliceDimensions(chartElement);
      const x = chartElement.x + midRadius * Math.cos(a);
      const y = chartElement.y + midRadius * Math.sin(a);
      return { x, y, a, w: 0.9 * (chartElement.outerRadius - chartElement.innerRadius) };
    },
    getLabel: (chart, dataset, valueIndex) => chart.data.labels[valueIndex],
    shouldSkipValue: ({ chartElement, textSize }) => {
      const { midAngle } = getSliceDimensions(chartElement);
      const { innerRadius, outerRadius, endAngle, startAngle } = chartElement;
      const { width, height } = textSize;
      const deltaX = outerRadius + innerRadius - width;
      const bottomLeft = {
        x: deltaX * Math.cos(midAngle) + height * Math.sin(midAngle),
        y: deltaX * Math.sin(midAngle) - height * Math.cos(midAngle),
      };
      const topLeft = {
        x: deltaX * Math.cos(midAngle) - height * Math.sin(midAngle),
        y: deltaX * Math.sin(midAngle) + height * Math.cos(midAngle),
      };
      let bottomLeftAngle = Math.atan(bottomLeft.y / bottomLeft.x);
      let topLeftAngle = Math.atan(topLeft.y / topLeft.x);
      if (bottomLeft.x < 0) {
        bottomLeftAngle += Math.PI;
      }
      if (topLeft.x < 0) {
        topLeftAngle += Math.PI;
      }
      return bottomLeftAngle < startAngle || topLeftAngle > endAngle;
    },
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
  });
}

function getTextDimensions(text: string[], ctx: CanvasRenderingContext2D): Dimensions {
  const font = computeTextFont({ fontSize: globalThis.Chart?.defaults.font.size ?? 12 }, "px");
  return text
    .map((text) => computeCachedTextDimension(ctx, text, font))
    .reduce(
      (acc, dim) => ({
        width: Math.max(acc.width, dim.width),
        height: acc.height + dim.height,
      }),
      { width: 0, height: 0 }
    );
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
