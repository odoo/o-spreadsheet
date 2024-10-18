import { ChartOptions, LinearScaleOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { LocaleFormat } from "../../../../types";
import {
  AxisDesign,
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  GenericDefinition,
  LineChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { getChartTimeOptions } from "../../../chart_date";
import { formatValue } from "../../../format/format";
import { isDefined, range, removeFalsyAttributes } from "../../../misc";
import {
  TREND_LINE_XAXIS_ID,
  chartFontColor,
  formatTickValue,
  getDefinedAxis,
} from "../chart_common";

type ChartScales = ChartOptions["scales"];

export function getBarChartScales(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  let scales: ChartScales = {};
  const { trendDataSetsValues: trendDatasets, locale, axisFormats } = args;
  const options = { stacked: definition.stacked, locale: locale };
  if (definition.horizontal) {
    scales.x = getChartAxis(definition, "bottom", "values", { ...options, format: axisFormats?.x });
    scales.y = getChartAxis(definition, "left", "labels", options);
  } else {
    scales.x = getChartAxis(definition, "bottom", "labels", options);
    const leftAxisOptions = { ...options, format: axisFormats?.y };
    scales.y = getChartAxis(definition, "left", "values", leftAxisOptions);
    const rightAxisOptions = { ...options, format: axisFormats?.y1 };
    scales.y1 = getChartAxis(definition, "right", "values", rightAxisOptions);
  }
  scales = removeFalsyAttributes(scales);

  if (trendDatasets && trendDatasets.length && trendDatasets.some(isDefined)) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    const maxLength = Math.max(...trendDatasets.map((trendDataset) => trendDataset?.length || 0));
    scales[TREND_LINE_XAXIS_ID] = {
      ...(scales!.x as any),
      labels: Array(maxLength).fill(""),
      offset: false,
      display: false,
    };
  }

  return scales;
}

export function getLineChartScales(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const { locale, axisType, trendDataSetsValues: trendDatasets, labels, axisFormats } = args;
  const labelFormat = axisFormats?.x;
  const stacked = definition.stacked;

  let scales: ChartScales = {
    x: getChartAxis(definition, "bottom", "labels", { locale }),
    y: getChartAxis(definition, "left", "values", { locale, stacked, format: axisFormats?.y }),
    y1: getChartAxis(definition, "right", "values", { locale, stacked, format: axisFormats?.y1 }),
  };
  scales = removeFalsyAttributes(scales);

  if (axisType === "time" && labels && labelFormat) {
    const axis = {
      type: "time",
      time: getChartTimeOptions(labels, labelFormat, locale),
    };
    Object.assign(scales!.x!, axis);
    scales!.x!.ticks!.maxTicksLimit = 15;
  } else if (axisType === "linear") {
    scales!.x!.type = "linear";
    scales!.x!.ticks!.callback = (value) => formatValue(value, { format: labelFormat, locale });
  }

  if (trendDatasets && trendDatasets.length && trendDatasets.some(isDefined)) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    const maxLength = Math.max(...trendDatasets.map((trendDataset) => trendDataset?.length || 0));
    scales[TREND_LINE_XAXIS_ID] = {
      ...(scales.x as any),
      type: "category",
      labels: range(0, maxLength).map((x) => x.toString()),
      offset: false,
      display: false,
    };
  }

  return scales;
}

export function getScatterChartScales(
  definition: GenericDefinition<ScatterChartDefinition>,
  args: ChartRuntimeGenerationArgs
) {
  const lineScales = getLineChartScales(definition, args);
  return {
    ...lineScales,
    x: {
      ...lineScales!.x,
      grid: { display: true },
    },
  };
}

export function getWaterfallChartScales(
  definition: WaterfallChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const { locale, axisFormats } = args;
  const format = axisFormats?.y || axisFormats?.y1;
  definition.dataSets;
  const scales: ChartScales = {
    x: {
      ...getChartAxis(definition, "bottom", "labels", { locale }),
      grid: { display: false },
    },
    y: {
      // TODO FIXME: we should probably remove definition.verticalAxisPosition and put everything inside axesDesign/datasets
      // like the other charts. We cannot use helpers like `getChartAxis` here because they look into definition.dataSet
      // which have plain wrong information, eg. the yAxisId of the dataset being "y" when the data is actually displayed
      // on the axis to the right.
      position: definition.verticalAxisPosition,
      ticks: {
        color: chartFontColor(definition.background),
        callback: formatTickValue({ locale, format }),
      },
      grid: {
        lineWidth: (context) => (context.tick.value === 0 ? 2 : 1),
      },
      title: getChartAxisTitleRuntime(definition.axesDesign?.y),
    },
  };

  const verticalScale = scales?.y || scales?.y1;
  if (verticalScale) {
    verticalScale.grid = { lineWidth: (context) => (context.tick.value === 0 ? 2 : 1) };
  }

  return scales;
}

export function getPyramidChartScales(
  definition: PyramidChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const scales = getBarChartScales(definition, args);
  const scalesXCallback = scales!.x!.ticks!.callback as (value: number) => string;
  scales!.x!.ticks!.callback = (value: number) => scalesXCallback(Math.abs(value));

  return scales;
}

export function getRadarChartScales(
  definition: GenericDefinition<RadarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const { locale, axisFormats } = args;
  return {
    r: {
      ticks: {
        callback: formatTickValue({ format: axisFormats?.r, locale }),
        backdropColor: definition.background || "#FFFFFF",
      },
      pointLabels: { color: chartFontColor(definition.background) },
    },
  };
}

function getChartAxisTitleRuntime(design?: AxisDesign):
  | {
      display: boolean;
      text: string;
      color?: string;
      font: {
        style: "italic" | "normal";
        weight: "bold" | "normal";
      };
      align: "start" | "center" | "end";
    }
  | undefined {
  if (design?.title?.text) {
    const { text, color, align, italic, bold } = design.title;
    return {
      display: true,
      text,
      color,
      font: {
        style: italic ? "italic" : "normal",
        weight: bold ? "bold" : "normal",
      },
      align: align === "left" ? "start" : align === "right" ? "end" : "center",
    };
  }
  return;
}

function getChartAxis(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  position: "left" | "right" | "bottom",
  type: "values" | "labels",
  options: LocaleFormat & { stacked?: boolean }
): DeepPartial<LinearScaleOptions> | undefined {
  const { useLeftAxis, useRightAxis } = getDefinedAxis(definition);
  if ((position === "left" && !useLeftAxis) || (position === "right" && !useRightAxis)) {
    return undefined;
  }

  const fontColor = chartFontColor(definition.background);
  let design: AxisDesign | undefined;
  if (position === "bottom") {
    design = definition.axesDesign?.x;
  } else if (position === "left") {
    design = definition.axesDesign?.y;
  } else {
    design = definition.axesDesign?.y1;
  }

  if (type === "values") {
    const displayGridLines = !(position === "right" && useLeftAxis);

    return {
      position: position,
      title: getChartAxisTitleRuntime(design),
      grid: {
        display: displayGridLines,
      },
      beginAtZero: true,
      stacked: options?.stacked,
      ticks: {
        color: fontColor,
        callback: formatTickValue(options),
      },
    };
  } else {
    return {
      ticks: {
        padding: 5,
        color: fontColor,
      },
      grid: {
        display: false,
      },
      stacked: options?.stacked,
      title: getChartAxisTitleRuntime(design),
    };
  }
}
