import { ChartDataset } from "chart.js";
import { largeMax } from "../../..";
import {
  BACKGROUND_CHART_COLOR,
  BORDER_CHART_COLOR,
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
  LINE_FILL_TRANSPARENCY,
} from "../../../../constants";
import { _t } from "../../../../translation";
import { ChartRuntimeGenerationArgs, Color, PartialDefinition } from "../../../../types";
import {
  BarChartDefinition,
  DatasetValues,
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
import { TREND_LINE_XAXIS_ID, getChartColorsGenerator } from "../chart_common";
import { getFillingMode, truncateLabel } from "../chart_ui_common";

export function getBarChartDatasets(
  definition: PartialDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (const index in dataSetsValues) {
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const color = colors.next();

    const dataset: ChartDataset<"bar"> = {
      label,
      data,
      borderColor: BORDER_CHART_COLOR,
      borderWidth: 1,
      backgroundColor: color,
      yAxisID: definition.horizontal ? "y" : definition.dataSets?.[index].yAxisId || "y",
      xAxisID: "x",
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDatasets?.[index];
    if (!trendConfig?.display || definition.horizontal || !trendData) {
      continue;
    }

    trendDatasets.push(getFullTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getWaterfallDatasetAndLabels(
  definition: PartialDefinition<WaterfallChartDefinition>,
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
  definition: PartialDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"line">[] {
  const { dataSetsValues, axisType, labels } = args;
  const dataSets: ChartDataset<"line">[] = [];

  const areaChart = !!definition.fillArea;
  const stackedChart = !!definition.stacked;
  const cumulative = !!definition.cumulative;

  const trendDatasets: any[] = [];

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let index = 0; index < dataSetsValues.length; index++) {
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const yAxisID = definition.dataSets?.[index].yAxisId || "y";

    const color = colors.next();
    let backgroundRGBA = colorToRGBA(color);
    if (areaChart) {
      backgroundRGBA.a = LINE_FILL_TRANSPARENCY;
    }
    if (cumulative) {
      let accumulator = 0;
      data = data.map((value) => {
        if (!isNaN(value)) {
          accumulator += parseFloat(value);
          return accumulator;
        }
        return value;
      });
    }
    if (axisType && ["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const backgroundColor = rgbaToHex(backgroundRGBA);

    const dataset: ChartDataset<"line"> = {
      label,
      data,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor,
      pointBackgroundColor: color,
      fill: areaChart ? getFillingMode(index, stackedChart) : false,
      yAxisID,
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDatasets?.[index];
    if (!trendConfig?.display || !trendData) {
      continue;
    }

    trendDatasets.push(getFullTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getScatterChartDatasets(
  definition: PartialDefinition<ScatterChartDefinition>,
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
  definition: PartialDefinition<PieChartDefinition>,
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
  definition: PartialDefinition<ComboChartDefinition>,
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
    const trendData = args.trendDatasets?.[index];
    if (!trendConfig?.display || !trendData) {
      continue;
    }

    trendDatasets.push(getFullTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getRadarChartDatasets(
  definition: PartialDefinition<RadarChartDefinition>,
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
    };
    if (fill) {
      dataset.backgroundColor = setColorAlpha(borderColor, 0.3);
      dataset.fill = true;
    }
    datasets.push(dataset);
  }
  return datasets;
}

function getFullTrendingLineDataSet(
  dataset: ChartDataset,
  config: TrendConfiguration,
  data: (number | null)[]
): ChartDataset<"line"> {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);

  return {
    type: "line",
    xAxisID: TREND_LINE_XAXIS_ID,
    label: dataset.label ? _t("Trend line for %s", dataset.label) : "",
    data,
    order: -1,
    showLine: true,
    pointRadius: 0,
    backgroundColor: undefined,
    borderColor,
    borderDash: [5, 5],
    borderWidth: undefined,
    fill: false,
    pointBackgroundColor: borderColor,
  };
}

function getPieColors(colors: ColorGenerator, dataSetsValues: DatasetValues[]): Color[] {
  const pieColors: Color[] = [];
  const maxLength = largeMax(dataSetsValues.map((ds) => ds.data.length));
  for (let i = 0; i <= maxLength; i++) {
    pieColors.push(colors.next());
  }

  return pieColors;
}
