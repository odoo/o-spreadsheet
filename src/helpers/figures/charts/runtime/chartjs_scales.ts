import { isDefined, range, removeFalsyAttributes } from "@odoo/o-spreadsheet-engine";
import {
  CHART_AXIS_TITLE_FONT_SIZE,
  CHART_PADDING,
  CHART_PADDING_BOTTOM,
  CHART_PADDING_TOP,
  DEFAULT_CHART_COLOR_SCALE,
  GRAY_300,
} from "@odoo/o-spreadsheet-engine/constants";
import { COLORSCHEMES, getColorScale } from "@odoo/o-spreadsheet-engine/helpers/color";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
  chartFontColor,
  chartGridColor,
  formatTickValue,
  getDefinedAxis,
  truncateLabel,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { formatValue, humanizeNumber } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import {
  AxisDesign,
  BarChartDefinition,
  ChartColorScale,
  ChartRuntimeGenerationArgs,
  ChartWithAxisDefinition,
  FunnelChartDefinition,
  GenericDefinition,
  LegendPosition,
  LineChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { CalendarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import {
  GeoChartDefinition,
  GeoChartProjection,
  GeoChartRuntimeGenerationArgs,
} from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { RadarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { ChartDataset, LinearScaleOptions, ScaleChartOptions, Tick } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { ChartColorScalePluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_colorscale_plugin";
import { Color, LocaleFormat } from "../../../../types";
import { getChartTimeOptions } from "../../../chart_date";

type ChartScales = DeepPartial<ScaleChartOptions<"line" | "bar" | "radar">["scales"]>;
type GeoChartScales = DeepPartial<ScaleChartOptions<"choropleth">["scales"]>;

export function getBarChartScales(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): DeepPartial<ScaleChartOptions<"line" | "bar">["scales"]> {
  let scales: DeepPartial<ScaleChartOptions<"line" | "bar">["scales"]> = {};
  const {
    trendDataSetsValues: trendDatasets,
    locale,
    axisFormats,
    background,
    colorAdapter,
  } = args;
  const options = { stacked: definition.stacked, locale: locale, background, colorAdapter };
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
    scales[MOVING_AVERAGE_TREND_LINE_XAXIS_ID] = {
      ...(scales!.x as any),
      offset: true,
      display: false,
    };
  }

  return scales;
}

export function getCalendarChartScales(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs,

  datasets: ChartDataset[]
): DeepPartial<ScaleChartOptions<"calendar">["scales"]> {
  const yLabels = datasets.map((dataset) => dataset.label || "");
  const fontColor = chartFontColor(args.background);
  return {
    y: {
      title: getChartAxisTitleRuntime(definition.axesDesign?.y, args.colorAdapter, fontColor),
      stacked: true,
      min: 0,
      max: yLabels.length,
      ticks: {
        // Here we have to use a step of 0.5 and skip every even label to have the labels centered
        // with the bars
        stepSize: 0.5,
        color: fontColor,
        callback: function (label, index, labels) {
          if (index % 2 === 0) {
            return undefined;
          }
          return yLabels[Math.floor((index - 1) / 2)];
        },
      },
      grid: {
        display: false,
      },
      border: { display: false },
    },
    x: {
      title: getChartAxisTitleRuntime(definition.axesDesign?.x, args.colorAdapter, fontColor),
      stacked: true,
      grid: {
        display: false,
      },
      position: "top",
      ticks: {
        color: fontColor,
      },
      border: { display: false },
    },
  };
}

export function getCalendarColorScale(
  definition: CalendarChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartColorScalePluginOptions | undefined {
  const { dataSetsValues } = args;
  if (!dataSetsValues.length || definition.legendPosition === "none") {
    return undefined;
  }
  const allValues = dataSetsValues.flatMap((ds) => ds.data).filter(isDefined);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  let colorScale: Color[] = [];
  if (typeof definition.colorScale === "object") {
    colorScale = [
      definition.colorScale.minColor,
      definition.colorScale.midColor,
      definition.colorScale.maxColor,
    ].filter(isDefined);
  } else {
    colorScale = [...COLORSCHEMES[definition.colorScale ?? "oranges"]];
  }
  return {
    position: definition.legendPosition === "right" ? "right" : "left",
    colorScale,
    fontColor: chartFontColor(args.background),
    minValue,
    maxValue,
    locale: args.locale,
  };
}

export function getLineChartScales(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): DeepPartial<ScaleChartOptions<"line">["scales"]> {
  const {
    locale,
    axisType,
    trendDataSetsValues: trendDatasets,
    labels,
    axisFormats,
    background,
  } = args;
  const labelFormat = axisFormats?.x;
  const stacked = definition.stacked;

  let scales: DeepPartial<ScaleChartOptions<"line">["scales"]> = {
    x: getChartAxis(definition, "bottom", "labels", {
      locale,
      background,
      colorAdapter: args.colorAdapter,
    }),
    y: getChartAxis(definition, "left", "values", {
      locale,
      stacked,
      format: axisFormats?.y,
      background,
      colorAdapter: args.colorAdapter,
    }),
    y1: getChartAxis(definition, "right", "values", {
      locale,
      stacked,
      format: axisFormats?.y1,
      background,
      colorAdapter: args.colorAdapter,
    }),
  };
  scales = removeFalsyAttributes(scales);

  if (axisType === "time" && labels && labelFormat) {
    const axis = {
      type: "time",
      time: getChartTimeOptions(labels, labelFormat, locale),
    };
    Object.assign(scales!.x!, axis);
    scales!.x!.ticks!.maxTicksLimit = 15;
    delete scales?.x?.ticks?.callback;
  } else if (axisType === "linear") {
    scales!.x!.type = "linear";
    scales!.x!.ticks!.callback = definition.humanize
      ? (value) => humanizeNumber({ value, format: labelFormat }, locale)
      : (value) => formatValue(value, { format: labelFormat, locale });
  }

  if (trendDatasets && trendDatasets.length && trendDatasets.some(isDefined)) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    scales[TREND_LINE_XAXIS_ID] = {
      ...(scales.x as any),
      display: false,
    };
    scales[MOVING_AVERAGE_TREND_LINE_XAXIS_ID] = {
      ...(scales.x as any),
      display: false,
    };
    if (axisType === "category" || axisType === "time") {
      /* We add a second x axis here to draw the trend lines, with the labels length being
       * set so that the second axis points match the classical x axis
       */
      const maxLength = Math.max(...trendDatasets.map((trendDataset) => trendDataset?.length || 0));
      scales[TREND_LINE_XAXIS_ID]!["type"] = "category";
      scales[TREND_LINE_XAXIS_ID]!["labels"] = range(0, maxLength).map((x) => x.toString());
      scales[TREND_LINE_XAXIS_ID]!["offset"] = false;
      scales[MOVING_AVERAGE_TREND_LINE_XAXIS_ID]!["type"] = "category";
      scales[MOVING_AVERAGE_TREND_LINE_XAXIS_ID]!["offset"] = false;
    }
  }

  return scales;
}

export function getScatterChartScales(
  definition: GenericDefinition<ScatterChartDefinition>,
  args: ChartRuntimeGenerationArgs
): DeepPartial<ScaleChartOptions<"line">["scales"]> {
  const lineScales = getLineChartScales(definition, args);
  return {
    ...lineScales,
    x: {
      ...lineScales!.x,
      grid: { display: true, color: chartGridColor(args.background) },
    },
  };
}

export function getWaterfallChartScales(
  definition: WaterfallChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const { locale, axisFormats, background } = args;
  const format = axisFormats?.y || axisFormats?.y1;
  const scales: ChartScales = {
    x: {
      ...getChartAxis(definition, "bottom", "labels", {
        locale,
        background,
        colorAdapter: args.colorAdapter,
      }),
      grid: { display: false },
    },
    y: {
      // TODO FIXME: we should probably remove definition.verticalAxisPosition and put everything inside axesDesign/datasets
      // like the other charts. We cannot use helpers like `getChartAxis` here because they look into definition.dataSet
      // which have plain wrong information, eg. the yAxisId of the dataset being "y" when the data is actually displayed
      // on the axis to the right.
      position: definition.verticalAxisPosition,
      ticks: {
        color: chartFontColor(args.background),
        callback: formatTickValue({ locale, format }, definition.humanize),
      },
      grid: {
        lineWidth: (context) => (context.tick.value === 0 ? 2 : 1),
        color: chartGridColor(args.background),
      },
      title: getChartAxisTitleRuntime(
        definition.axesDesign?.y,
        args.colorAdapter,
        chartFontColor(args.background)
      ),
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
  const { dataSetsValues } = args;
  const scales = getBarChartScales(definition, args);
  const scalesXCallback = scales!.x!.ticks!.callback as (value: number) => string;
  scales!.x!.ticks!.callback = (value: number) => scalesXCallback(Math.abs(value));

  const maxValue = Math.max(
    ...dataSetsValues.map((dataSet) => Math.max(...dataSet.data.map(Math.abs)))
  );
  scales!.x!.suggestedMin = -maxValue;
  scales!.x!.suggestedMax = maxValue;

  return scales;
}

export function getRadarChartScales(
  definition: GenericDefinition<RadarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const { locale, axisFormats, dataSetsValues } = args;
  const minValue = Math.min(
    ...dataSetsValues.map((ds) => Math.min(...ds.data.filter((x) => !isNaN(x))))
  );
  return {
    r: {
      beginAtZero: true,
      ticks: {
        callback: formatTickValue({ format: axisFormats?.r, locale }, definition.humanize),
        backdropColor: args.background,
        color: chartFontColor(args.background),
      },
      pointLabels: {
        color: chartFontColor(args.background),
        callback: (label: string) => truncateLabel(label),
      },
      grid: {
        color: chartGridColor(args.background),
      },
      suggestedMin: minValue < 0 ? minValue - 1 : 0,
    },
  };
}

export function getGeoChartScales(
  definition: GeoChartDefinition,
  args: GeoChartRuntimeGenerationArgs
): GeoChartScales {
  const { locale, axisFormats, availableRegions } = args;

  const geoLegendPosition = legendPositionToGeoLegendPosition(definition.legendPosition);
  const region = definition.region
    ? availableRegions.find((r) => r.id === definition.region)
    : availableRegions[0];

  const format = axisFormats?.y || axisFormats?.y1;
  return {
    projection: {
      // projection: region?.defaultProjection,
      projection: getGeoChartProjection(region?.defaultProjection || "mercator"),
      axis: "x" as const,
    },
    color: {
      axis: "x",
      display: definition.legendPosition !== "none",
      border: { color: GRAY_300 },
      grid: { color: chartGridColor(args.background) },
      ticks: {
        color: chartFontColor(args.background),
        callback: formatTickValue({ locale, format }, definition.humanize),
      },
      legend: {
        position: geoLegendPosition,
        align: geoLegendPosition.includes("right") ? "left" : "right",
        margin: getLegendMargin(definition),
      },
      interpolate: getRuntimeColorScale(definition.colorScale ?? DEFAULT_CHART_COLOR_SCALE),
      missing: definition.missingValueColor || "#ffffff",
    },
  };
}

export function getFunnelChartScales(
  definition: FunnelChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartScales {
  const dataSet = args.dataSetsValues[0];
  return {
    x: {
      display: false,
    },
    y: {
      grid: { offset: false, color: chartGridColor(args.background) }, // bar charts grid is offset by default
      ticks: {
        color: chartFontColor(args.background),
        callback: function (tickValue: number) {
          return truncateLabel(this.getLabelForValue(tickValue));
        },
      },
      border: { display: false },
    },
    percentages: {
      position: "right",
      border: { display: false },
      ticks: {
        color: chartFontColor(args.background),
        callback: function (tickValue, index, ticks) {
          const value = dataSet.data?.[index];
          const baseValue = dataSet.data?.[0];
          if (!baseValue || value === undefined) {
            return "";
          }
          return formatValue(value / baseValue, { format: "0%", locale: args.locale });
        },
      },
      grid: { display: false },
    },
  };
}

function getGeoChartProjection(projection: GeoChartProjection) {
  if (projection === "conicConformal") {
    return globalThis.ChartGeo.geoConicConformal().rotate([100, 0]); // Centered on the US
  }
  return projection;
}

function getChartAxisTitleRuntime(
  design: AxisDesign | undefined,
  colorAdapter: ((color: Color) => Color) | undefined,
  fontColor: Color
):
  | {
      display: boolean;
      text: string;
      color?: string;
      font: {
        style: "italic" | "normal";
        weight: "bold" | "normal";
        size: number;
      };
      align: "start" | "center" | "end";
    }
  | undefined {
  if (design?.title?.text) {
    const { text, align, italic, bold } = design.title;
    let color = design.title.color;
    if (color && colorAdapter) {
      color = colorAdapter(color);
    }
    return {
      display: true,
      text,
      color: color || fontColor,
      font: {
        style: italic ? "italic" : "normal",
        weight: bold ? "bold" : "normal",
        size: design.title.fontSize ?? CHART_AXIS_TITLE_FONT_SIZE,
      },
      align: align === "left" ? "start" : align === "right" ? "end" : "center",
    };
  }
  return;
}

function getChartAxis(
  definition: GenericDefinition<ChartWithAxisDefinition>,
  position: "left" | "right" | "bottom",
  type: "values" | "labels",
  options: LocaleFormat & {
    stacked?: boolean;
    background: Color;
    colorAdapter: ((color: Color) => Color) | undefined;
  }
): DeepPartial<LinearScaleOptions> | undefined {
  const { useLeftAxis, useRightAxis } = getDefinedAxis(definition);
  if ((position === "left" && !useLeftAxis) || (position === "right" && !useRightAxis)) {
    return undefined;
  }

  const fontColor = chartFontColor(options.background);
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
      title: getChartAxisTitleRuntime(design, options.colorAdapter, fontColor),
      grid: {
        display: displayGridLines,
        color: chartGridColor(options.background),
      },
      beginAtZero: true,
      stacked: options?.stacked,
      ticks: {
        color: fontColor,
        callback: formatTickValue(options, definition.humanize),
      },
    };
  } else {
    return {
      ticks: {
        padding: 5,
        color: fontColor,
        callback: function (tickValue: number, index: number, ticks: Tick[]) {
          // Category axis callback's internal tick value is the index of the label
          // https://www.chartjs.org/docs/latest/axes/labelling.html#creating-custom-tick-formats
          return truncateLabel(this.getLabelForValue(tickValue));
        },
      },
      grid: {
        display: false,
      },
      stacked: options?.stacked,
      title: getChartAxisTitleRuntime(design, options.colorAdapter, fontColor),
    };
  }
}

export function getRuntimeColorScale(colorScale: ChartColorScale, minValue = 0, maxValue = 1) {
  if (minValue === maxValue) {
    const color = colorScale.midColor ?? colorScale.minColor;
    return (_: number) => color;
  }
  const scaleColors = [{ value: minValue, color: colorScale.minColor }];
  if (colorScale.midColor) {
    scaleColors.push({ value: (minValue + maxValue) / 2, color: colorScale.midColor });
  }
  scaleColors.push({ value: maxValue, color: colorScale.maxColor });
  return getColorScale(scaleColors);
}

function getLegendMargin(definition: GeoChartDefinition) {
  switch (definition.legendPosition) {
    case "top":
    case "right":
      const hasTitle = !!definition.title.text;
      const topMargin = hasTitle ? CHART_PADDING_TOP + 30 : CHART_PADDING_TOP;
      return { top: topMargin, left: CHART_PADDING, right: CHART_PADDING };
    case "bottom":
    case "left":
    case "none":
      return { left: CHART_PADDING, right: CHART_PADDING, bottom: CHART_PADDING_BOTTOM };
  }
}

function legendPositionToGeoLegendPosition(position: LegendPosition) {
  switch (position) {
    case "top":
      return "top-left";
    case "right":
      return "top-right";
    case "bottom":
      return "bottom-right";
    case "left":
      return "bottom-left";
    case "none":
      return "bottom-left";
  }
}
