import { ChartDataset, Point } from "chart.js";
import {
  BACKGROUND_CHART_COLOR,
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
  LINE_FILL_TRANSPARENCY,
} from "../../../../constants";
import { _t } from "../../../../translation";
import { ChartRuntimeGenerationArgs, Color, GenericDefinition } from "../../../../types";
import {
  BarChartDefinition,
  ChartWithDataSetDefinition,
  FunnelChartColors,
  FunnelChartDefinition,
  LineChartDefinition,
  PieChartDefinition,
  ScatterChartDefinition,
  TrendConfiguration,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import {
  GeoChartDefinition,
  GeoChartRuntimeGenerationArgs,
} from "../../../../types/chart/geo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import {
  ColorGenerator,
  colorToRGBA,
  lightenColor,
  rgbaToHex,
  setColorAlpha,
} from "../../../color";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
  getPieColors,
  isTrendLineAxis,
} from "../chart_common";

export function getBarChartDatasets(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (const index in dataSetsValues) {
    let { label, data, hidden } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const backgroundColor = colors.next();
    const dataset: ChartDataset<"bar"> = {
      label,
      data,
      hidden,
      borderColor: definition.background || BACKGROUND_CHART_COLOR,
      borderWidth: definition.stacked ? 1 : 0,
      backgroundColor,
      yAxisID: definition.horizontal ? "y" : definition.dataSets?.[index].yAxisId || "y",
      xAxisID: "x",
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDataSetsValues?.[index];
    if (!trendConfig?.display || definition.horizontal || !trendData) {
      continue;
    }

    trendDatasets.push(getTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getWaterfallDatasetAndLabels(
  definition: GenericDefinition<WaterfallChartDefinition>,
  args: ChartRuntimeGenerationArgs
): {
  datasets: ChartDataset[];
  labels: string[];
} {
  const { dataSetsValues, labels } = args;

  const negativeColor = definition.negativeValuesColor || CHART_WATERFALL_NEGATIVE_COLOR;
  const positiveColor = definition.positiveValuesColor || CHART_WATERFALL_POSITIVE_COLOR;
  const subTotalColor = definition.subTotalValuesColor || CHART_WATERFALL_SUBTOTAL_COLOR;

  const backgroundColor: Color[] = [];
  const datasetValues: Array<[number, number]> = [];
  const dataset: ChartDataset = {
    label: "",
    data: datasetValues,
    backgroundColor,
  };
  const labelsWithSubTotals: string[] = [];
  let lastValue = 0;
  for (const dataSetsValue of dataSetsValues) {
    if (dataSetsValue.hidden) {
      continue;
    }
    for (let i = 0; i < dataSetsValue.data.length; i++) {
      const data = dataSetsValue.data[i];
      labelsWithSubTotals.push(labels[i]);
      if (isNaN(Number(data))) {
        datasetValues.push([lastValue, lastValue]);
        backgroundColor.push("");
        continue;
      }
      datasetValues.push([lastValue, data + lastValue]);
      let color = data >= 0 ? positiveColor : negativeColor;
      if (i === 0 && dataSetsValue === dataSetsValues[0] && definition.firstValueAsSubtotal) {
        color = subTotalColor;
      }
      backgroundColor.push(color);
      lastValue += data;
    }
    if (definition.showSubTotals) {
      labelsWithSubTotals.push(_t("Subtotal"));
      datasetValues.push([0, lastValue]);
      backgroundColor.push(subTotalColor);
    }
  }

  return {
    datasets: [dataset],
    labels: labelsWithSubTotals,
  };
}

export function getLineChartDatasets(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"line">[] {
  const { dataSetsValues, axisType, labels } = args;
  const dataSets: ChartDataset<"line">[] = [];

  const areaChart = !!definition.fillArea;
  const stackedChart = !!definition.stacked;

  const trendDatasets: any[] = [];

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let index = 0; index < dataSetsValues.length; index++) {
    let { label, data, hidden } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const color = colors.next();
    if (axisType && ["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const dataset: ChartDataset<"line"> = {
      label,
      data,
      hidden,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor: areaChart ? setColorAlpha(color, LINE_FILL_TRANSPARENCY) : color,
      pointBackgroundColor: color,
      fill: areaChart ? getFillingMode(index, stackedChart) : false,
      yAxisID: definition.dataSets?.[index].yAxisId || "y",
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDataSetsValues?.[index];
    if (!trendConfig?.display || !trendData) {
      continue;
    }

    trendDatasets.push(getTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getScatterChartDatasets(
  definition: GenericDefinition<ScatterChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset[] {
  const dataSets: ChartDataset<"line">[] = getLineChartDatasets(definition, args);
  for (const dataSet of dataSets) {
    if (!isTrendLineAxis(dataSet.xAxisID as string)) {
      dataSet.showLine = false;
    }
  }
  return dataSets;
}

export function getPieChartDatasets(
  definition: GenericDefinition<PieChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"pie">[] {
  const { dataSetsValues } = args;
  const dataSets: ChartDataset<"pie">[] = [];
  const dataSetsLength = Math.max(0, ...dataSetsValues.map((ds) => ds?.data?.length ?? 0));
  const backgroundColor = getPieColors(new ColorGenerator(dataSetsLength), dataSetsValues);
  for (const { label, data, hidden } of dataSetsValues) {
    if (hidden) continue;
    const dataset: ChartDataset<"pie"> = {
      label,
      data,
      borderColor: definition.background || "#FFFFFF",
      backgroundColor,
      hoverOffset: 30,
    };
    dataSets!.push(dataset);
  }
  return dataSets;
}

export function getComboChartDatasets(
  definition: GenericDefinition<ComboChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (let index = 0; index < dataSetsValues.length; index++) {
    let { label, data, hidden } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const design = definition.dataSets?.[index];
    const color = colors.next();

    const type = design?.type ?? "line";
    const dataset: ChartDataset<"bar" | "line"> = {
      label: label,
      data,
      hidden,
      borderColor: color,
      backgroundColor: color,
      yAxisID: definition.dataSets?.[index].yAxisId || "y",
      xAxisID: "x",
      type,
      order: type === "bar" ? dataSetsValues.length + index : index,
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDataSetsValues?.[index];
    if (!trendConfig?.display || !trendData) {
      continue;
    }

    trendDatasets.push(getTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getRadarChartDatasets(
  definition: GenericDefinition<RadarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"radar">[] {
  const { dataSetsValues } = args;
  const datasets: ChartDataset<"radar">[] = [];

  const fill = definition.fillArea ?? false;

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let i = 0; i < dataSetsValues.length; i++) {
    let { label, data, hidden } = dataSetsValues[i];
    if (definition.dataSets?.[i]?.label) {
      label = definition.dataSets[i].label;
    }
    const borderColor = colors.next();
    const dataset: ChartDataset<"radar"> = {
      label,
      data,
      hidden,
      borderColor,
      backgroundColor: borderColor,
    };
    if (fill) {
      dataset.backgroundColor = setColorAlpha(borderColor, LINE_FILL_TRANSPARENCY);
      dataset.fill = "start"; // fills from the start of the axes (default is to start at 0)
    }
    datasets.push(dataset);
  }
  return datasets;
}

export function getGeoChartDatasets(
  definition: GenericDefinition<GeoChartDefinition>,
  args: GeoChartRuntimeGenerationArgs
): ChartDataset[] {
  const { availableRegions, dataSetsValues, labels } = args;

  const regionName = definition.region || availableRegions[0]?.id;
  const features = regionName ? args.getGeoJsonFeatures(regionName) : undefined;

  const dataset: ChartDataset<"choropleth"> = {
    outline: features,
    showOutline: !!features,
    data: [],
  };

  if (features && regionName) {
    const labelsAndValues: { [featureId: string]: { value: number; label: string } } = {};
    if (dataSetsValues[0]) {
      for (let i = 0; i < dataSetsValues[0].data.length; i++) {
        if (!labels[i] || dataSetsValues[0].data[i] === undefined) {
          continue;
        }
        const featureId = args.geoFeatureNameToId(regionName, labels[i]);
        if (featureId) {
          labelsAndValues[featureId] = { value: dataSetsValues[0].data[i], label: labels[i] };
        }
      }
    }

    for (const feature of features) {
      if (!feature.id) {
        continue;
      }
      dataset.data.push({
        feature: {
          ...feature,
          properties: { name: labelsAndValues[feature.id]?.label },
        },
        value: labelsAndValues[feature.id]?.value,
      });
    }
  }

  return [dataset];
}

export function getFunnelChartDatasets(
  definition: FunnelChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar">[] {
  const dataSetsValues = args.dataSetsValues[0];
  const labels = args.labels;
  if (!dataSetsValues) {
    return [];
  }

  let { label: datasetLabel, data } = dataSetsValues;
  datasetLabel = definition.dataSets?.[0].label || datasetLabel;

  const dataset: ChartDataset<"bar"> = {
    label: datasetLabel,
    data: data.map((value) => (value <= 0 ? [0, 0] : [-value, value])),
    backgroundColor: getFunnelLabelColors(labels, definition.funnelColors),
    yAxisID: "y",
    xAxisID: "x",
    barPercentage: 1,
    categoryPercentage: 1,
    borderColor: definition.background || BACKGROUND_CHART_COLOR,
    borderWidth: 3,
  };

  return [dataset];
}

export function getFunnelLabelColors(labels: string[], colors?: FunnelChartColors): Color[] {
  const colorGenerator = new ColorGenerator(labels.length, colors);
  return labels.map(() => colorGenerator.next());
}

function getTrendingLineDataSet(
  dataset: ChartDataset<"line" | "bar">,
  config: TrendConfiguration,
  data: Point[]
): ChartDataset<"line"> {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);

  return {
    type: "line",
    xAxisID:
      config.type === "trailingMovingAverage"
        ? MOVING_AVERAGE_TREND_LINE_XAXIS_ID
        : TREND_LINE_XAXIS_ID,
    yAxisID: dataset.yAxisID,
    label: dataset.label ? _t("Trend line for %s", dataset.label) : "",
    data,
    order: -1,
    showLine: true,
    pointRadius: 0,
    backgroundColor: borderColor,
    borderColor,
    borderDash: [5, 5],
    borderWidth: undefined,
    fill: false,
    pointBackgroundColor: borderColor,
  };
}

/**
 * If the chart is a stacked area chart, we want to fill until the next dataset.
 * If the chart is a simple area chart, we want to fill until the origin (bottom axis).
 *
 * See https://www.chartjs.org/docs/latest/charts/area.html#filling-modes
 */
function getFillingMode(index: number, stackedChart: boolean): string {
  if (!stackedChart) {
    return "origin";
  }
  return index === 0 ? "origin" : "-1";
}

export function getChartColorsGenerator(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  dataSetsSize: number
) {
  return new ColorGenerator(
    dataSetsSize,
    definition.dataSets?.map((ds) => ds.backgroundColor) || []
  );
}
