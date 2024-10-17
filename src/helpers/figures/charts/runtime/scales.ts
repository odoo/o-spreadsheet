import { ChartOptions } from "chart.js";
import { Format, Locale } from "../../../../types";
import {
  AxisType,
  BarChartDefinition,
  CommonChartJSDefinition,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboBarChartDefinition } from "../../../../types/chart/common_bar_combo";
import { getChartTimeOptions } from "../../../chart_date";
import { formatValue } from "../../../format/format";
import { range, removeFalsyAttributes } from "../../../misc";
import { TREND_LINE_XAXIS_ID, getChartAxis } from "../chart_common";
import {
  comboDefinitionToBar,
  pyramidDefinitionToBar,
  scatterDefinitionToLine,
  waterfallDefinitionToBar,
} from "./convert_definition";

// interface ChartScales {
//   [key: string]: any;
// }
type ChartScales = ChartOptions["scales"];

interface ScaleArgs {
  locale: Locale;
  leftAxisFormat?: string;
  rightAxisFormat?: string;
  trendDatasets?: { data: number[] }[];
  axisType?: AxisType;
  labelFormat?: Format;
  labels?: string[];
}

export function getCommonChartScales(
  definition: CommonChartJSDefinition,
  args: ScaleArgs
): ChartScales {
  return {};
}

export function getBarChartScales(definition: BarChartDefinition, args: ScaleArgs): ChartScales {
  let scales: ChartScales = {};
  const { trendDatasets, locale, leftAxisFormat, rightAxisFormat } = args;
  const options = { stacked: definition.stacked, locale: locale };
  if (definition.horizontal) {
    const format = leftAxisFormat || rightAxisFormat;
    scales.x = getChartAxis(definition, "bottom", "values", { ...options, format });
    scales.y = getChartAxis(definition, "left", "labels", options);
  } else {
    scales.x = getChartAxis(definition, "bottom", "labels", options);
    const leftAxisOptions = { ...options, format: leftAxisFormat };
    scales.y = getChartAxis(definition, "left", "values", leftAxisOptions);
    const rightAxisOptions = { ...options, format: rightAxisFormat };
    scales.y1 = getChartAxis(definition, "right", "values", rightAxisOptions);
  }
  scales = removeFalsyAttributes(scales);

  if (trendDatasets && trendDatasets.length) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    const maxLength = Math.max(...trendDatasets.map((trendDataset) => trendDataset.data.length));
    scales[TREND_LINE_XAXIS_ID] = {
      ...(scales!.x as any),
      labels: Array(maxLength).fill(""),
      offset: false,
      display: false,
    };
  }

  return { ...getCommonChartScales(definition, args), ...scales };
}

export function getLineChartScales(definition: LineChartDefinition, args: ScaleArgs): ChartScales {
  const { locale, leftAxisFormat, rightAxisFormat, axisType, trendDatasets, labelFormat, labels } =
    args;
  const stacked = definition.stacked;
  let scales: ChartScales = {
    x: getChartAxis(definition, "bottom", "labels", { locale }),
    y: getChartAxis(definition, "left", "values", { locale, stacked, format: leftAxisFormat }),
    y1: getChartAxis(definition, "right", "values", { locale, stacked, format: rightAxisFormat }),
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

  if (trendDatasets && trendDatasets.length) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    const maxLength = Math.max(...trendDatasets.map((trendDataset) => trendDataset.data.length));
    scales[TREND_LINE_XAXIS_ID] = {
      ...(scales.x as any),
      type: "category",
      labels: range(0, maxLength).map((x) => x.toString()),
      offset: false,
      display: false,
    };
  }

  return { ...getCommonChartScales(definition, args), ...scales };
}

export function getPieChartScales(definition: PieChartDefinition, args: ScaleArgs): ChartScales {
  return { ...getCommonChartScales(definition, args) };
}

export function getComboBarChartScales(
  definition: ComboBarChartDefinition,
  args: ScaleArgs
): ChartScales {
  return { ...getBarChartScales(comboDefinitionToBar(definition), args) };
}

export function getWaterfallChartScales(
  definition: WaterfallChartDefinition,
  args: ScaleArgs
): ChartScales {
  const scales = getBarChartScales(waterfallDefinitionToBar(definition), args);

  scales!.x!.grid = { display: false };
  scales!.y!.grid = {
    lineWidth: (context) => (context.tick.value === 0 ? 2 : 1),
  };

  return scales;
}

export function getPyramidChartScales(
  definition: PyramidChartDefinition,
  args: ScaleArgs
): ChartScales {
  const scales = getBarChartScales(pyramidDefinitionToBar(definition), args);
  const scalesXCallback = scales!.x!.ticks!.callback as (value: number) => string;
  scales!.x!.ticks!.callback = (value: number) => scalesXCallback(Math.abs(value));

  return scales;
}

export function getScatterChartScales(
  definition: ScatterChartDefinition,
  args: ScaleArgs
): ChartScales {
  return { ...getLineChartScales(scatterDefinitionToLine(definition), args) };
}
