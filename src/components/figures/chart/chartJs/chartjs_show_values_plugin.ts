import type { Chart, ChartMeta, ChartType, Plugin, PointElement } from "chart.js";
import { colorToRGBA } from "../../../../helpers/color";
import {
  chartFontColor,
  formatValueWithPercentage,
  isTrendLineAxis,
} from "../../../../helpers/figures/charts/chart_common";
import {
  clipTextWithEllipsis,
  computeCachedTextDimension,
  computeTextFont,
} from "../../../../helpers/text_helper";
import type {
  ChartType as AllChartType,
  ChartShowValues,
  ChartStyle,
} from "../../../../types/chart/chart";
import { PieChartDefaults } from "../../../../types/chart/pie_chart";
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
const VERTICAL_PADDING = 3;

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
        drawPyramidValues(chart, options);
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
  getPercentages?: (chart: any, dataset: any) => number[] | undefined;
  getValuePosition: (args: CallbackArgs) => {
    x: number;
    y: number;
    angle?: number;
    maxWidth?: number;
  };
  getLabel?: (chart: any, dataset: any, valueIndex: number) => string;
  shouldSkipValue: (args: CallbackArgs) => boolean;
  getTextColors: (args: CallbackArgs) => TextStyle;
  style?: ChartStyle;
  splitValueAndPercentage?: boolean;
}) {
  const { chart, options, getNumberValue, getLabel, getPercentages, direction, style } = args;
  const ctx = chart.ctx as CanvasRenderingContext2D;
  ctx.save();

  const font = computeTextFont(
    {
      fontSize: style?.fontSize ?? globalThis.Chart?.defaults.font.size ?? 12,
      bold: style?.bold,
      italic: style?.italic,
    },
    "px"
  );
  if (style) {
    ctx.font = font;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.miterLimit = 1; // Avoid sharp artifacts on strokeText

  const textsPositions: Record<number, number[]> = {};
  for (const dataset of chart._metasets) {
    if (isTrendLineAxis(dataset.xAxisID) || dataset.hidden) {
      continue;
    }

    let percentages: number[] | undefined = undefined;
    if (options.display?.percentages) {
      percentages = getPercentages?.(chart, dataset);
    }

    for (let i = 0; i < dataset._parsed.length; i++) {
      const numberValue = options.display?.values ? getNumberValue(dataset, i) : undefined;
      const label = options.display?.labels ? getLabel?.(chart, dataset, i) : undefined;
      const percentage = percentages?.[i];
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
      const formattedValue =
        numberValue !== undefined && !isNaN(numberValue)
          ? options.callback(numberValue, dataset, i)
          : undefined;
      const displayedValues = args.splitValueAndPercentage
        ? [
            formattedValue,
            formatValueWithPercentage(undefined, percentage, formattedValue !== undefined),
          ]
        : [formatValueWithPercentage(formattedValue, percentage)];
      for (const displayedValue of displayedValues) {
        if (displayedValue) {
          valuesToDisplay.push(displayedValue);
        }
      }
      const textSize = getTextDimensions(valuesToDisplay, ctx, font);

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

      const textColors = args.getTextColors(callbackArgs);
      const strokeColor = textColors.strokeColor;
      const textColor = style?.color ?? textColors.textColor;
      let { x, y, angle, maxWidth } = position;
      ctx.save();
      ctx.translate(x, y);
      if (label === undefined && percentage === undefined) {
        angle = 0;
      }
      if (angle !== undefined) {
        if (angle > Math.PI / 2) {
          angle += Math.PI;
        }
        ctx.rotate(angle);
      }
      if (maxWidth !== undefined) {
        for (const i in valuesToDisplay) {
          valuesToDisplay[i] = clipTextWithEllipsis(ctx, valuesToDisplay[i], maxWidth);
        }
      }
      const lineHeight = textSize.height / valuesToDisplay.length;
      const getLineY = (lineIndex: number) =>
        (lineIndex - (valuesToDisplay.length - 1) / 2) * lineHeight;
      if (!!strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3; // Stroke the text with a big lineWidth width to have some kind of background
        valuesToDisplay.forEach((text, lineIndex) => ctx.strokeText(text, 0, getLineY(lineIndex)));
      }
      ctx.fillStyle = textColor;
      ctx.lineWidth = 1;
      valuesToDisplay.forEach((text, lineIndex) => ctx.fillText(text, 0, getLineY(lineIndex)));
      ctx.restore();
    }
  }

  ctx.restore();
}

function computePercentages(values: number[]): number[] | undefined {
  const total = values.reduce((sum, value) => (isFinite(value) ? sum + value : sum), 0) / 100;
  if (total === 0 || !isFinite(total)) {
    return undefined;
  }
  return values.map((value) => value / total);
}

function getBarPercentages(chart: any, dataset: any): number[] | undefined {
  if (!dataset._stacked) {
    return computePercentages(dataset._dataset.data);
  }
  const stackDatasets = chart._metasets.filter(
    (meta: any) =>
      meta.type === "bar" &&
      chart.isDatasetVisible(meta.index) &&
      meta.vScale?.id === dataset.vScale?.id &&
      meta.stack === dataset.stack
  );
  return dataset._dataset.data.map((value: number, index: number) => {
    const stackValues = stackDatasets.map((meta: any) => meta._dataset.data[index]);
    const total = stackValues.reduce(
      (sum: number, stackValue: number) => (isFinite(stackValue) ? sum + stackValue : sum),
      0
    );
    return total === 0 ? NaN : (value / total) * 100;
  });
}

function drawVerticalBarValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "vertical",
    getNumberValue: (dataset, i) => Number(dataset._parsed[i].y),
    getPercentages: getBarPercentages,
    getValuePosition: getVerticalBarValuePosition,
    shouldSkipValue: ({ dataset }) => isLineOverlayOnBarChart(options, dataset),
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
    splitValueAndPercentage: true,
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
    getPercentages:
      options.type === "line"
        ? (_, dataset) => {
            const values: number[] = dataset._parsed.map((value) =>
              value === null || value === undefined ? NaN : Number(value.y)
            );
            const total = values.findLast((value) => isFinite(value));
            if (!total) {
              return undefined;
            }
            return values.map((value) => (value / total) * 100);
          }
        : undefined,
    getValuePosition: ({ chartElement, textSize }) => ({
      x: chartElement.x,
      y: chartElement.y - VERTICAL_PADDING - textSize.height / 2,
    }),
    shouldSkipValue: () => false,
    getTextColors: chartElementColoredTextWithChartBackgroundHalo,
    splitValueAndPercentage: true,
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
    getPercentages: (chart, dataset) => {
      const total =
        chart._metasets.reduce(
          (sum: number, meta: any) =>
            sum +
            meta._dataset.values.reduce((sum: number, value: number) => sum + (value ?? 0), 0),
          0
        ) / 100;
      if (total === 0) {
        return undefined;
      }
      return dataset._dataset.values.map((value: number) =>
        value === undefined ? undefined : value / total
      );
    },
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
    splitValueAndPercentage: true,
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
    getPercentages: getBarPercentages,
    getValuePosition: getHorizontalBarValuePosition,
    shouldSkipValue: ({ dataset }) => isLineOverlayOnBarChart(options, dataset),
    getTextColors: chartBackgroundColoredTextWithElementColoredHalo,
  });
}

function drawPyramidValues(chart: any, options: ChartShowValuesPluginOptions) {
  drawValues({
    chart,
    options,
    direction: "horizontal",
    getNumberValue: (dataset, i) => dataset._parsed[i].x,
    getPercentages: (chart, dataset) => {
      const total =
        chart._metasets.reduce(
          (sum: number, dataset: any) =>
            sum + dataset._parsed.reduce((sum: number, item) => sum + Math.abs(item.x), 0),
          0
        ) / 100;
      if (total === 0) {
        return undefined;
      }
      return dataset._parsed.map((item) => Math.abs(item.x) / total);
    },
    // Use the actual bar value to know on which side to draw, even if the value itself is not displayed
    getValuePosition: (args) =>
      getHorizontalBarValuePosition({
        ...args,
        numberValue: args.dataset._parsed[args.valueIndex].x,
      }),
    shouldSkipValue: ({ chartElement, dataset }) =>
      !chartElement.width || isLineOverlayOnBarChart(options, dataset),
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
    getPercentages: (_, dataset) => computePercentages(dataset._parsed.map(Number)),
    getValuePosition: ({ chartElement }) => {
      const { midAngle: angle, midRadius } = getSliceDimensions(chartElement);
      const x = chartElement.x + midRadius * Math.cos(angle);
      const y = chartElement.y + midRadius * Math.sin(angle);
      return { x, y, angle, maxWidth: 0.9 * (chartElement.outerRadius - chartElement.innerRadius) };
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
    style: { ...PieChartDefaults.showData.valuesDesign, ...options.display?.valuesDesign },
  });
}

function getTextDimensions(
  text: string[],
  ctx: CanvasRenderingContext2D,
  font: string
): Dimensions {
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

function getHorizontalBarValuePosition(args: CallbackArgs) {
  const { chartElement, numberValue, dataset, textSize, chart } = args;
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
}
