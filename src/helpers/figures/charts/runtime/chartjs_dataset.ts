import { ChartDataset } from "chart.js";
import {
  BACKGROUND_CHART_COLOR,
  BORDER_CHART_COLOR,
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
  LineChartDefinition,
  PieChartDefinition,
  ScatterChartDefinition,
  TrendConfiguration,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import {
  ColorGenerator,
  colorToRGBA,
  lightenColor,
  rgbaToHex,
  setColorAlpha,
} from "../../../color";
import { TREND_LINE_XAXIS_ID, getPieColors } from "../chart_common";
import { truncateLabel } from "../chart_ui_common";

export function getBarChartDatasets(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (const index in dataSetsValues) {
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const backgroundColor = colors.next();
    const dataset: ChartDataset<"bar"> = {
      label,
      data,
      borderColor: BORDER_CHART_COLOR,
      borderWidth: 1,
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
    labels: labelsWithSubTotals.map(truncateLabel),
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
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const color = colors.next();
    if (axisType && ["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const dataset: ChartDataset<"line"> = {
      label,
      data,
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
    if (dataSet.xAxisID !== TREND_LINE_XAXIS_ID) {
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
  for (const { label, data } of dataSetsValues) {
    const dataset: ChartDataset<"pie"> = {
      label,
      data,
      borderColor: BACKGROUND_CHART_COLOR,
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
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const design = definition.dataSets?.[index];
    const color = colors.next();

    const type = design?.type ?? "line";
    const dataset: ChartDataset<"bar" | "line"> = {
      label: label,
      data,
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
    let { label, data } = dataSetsValues[i];
    if (definition.dataSets?.[i]?.label) {
      label = definition.dataSets[i].label;
    }
    const borderColor = colors.next();
    const dataset: ChartDataset<"radar"> = {
      label,
      data,
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

function getTrendingLineDataSet(
  dataset: ChartDataset<"line" | "bar">,
  config: TrendConfiguration,
  data: (number | null)[]
): ChartDataset<"line"> {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);

  return {
    type: "line",
    xAxisID: TREND_LINE_XAXIS_ID,
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

function getChartColorsGenerator(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  dataSetsSize: number
) {
  return new ColorGenerator(
    dataSetsSize,
    definition.dataSets?.map((ds) => ds.backgroundColor) || []
  );
}
