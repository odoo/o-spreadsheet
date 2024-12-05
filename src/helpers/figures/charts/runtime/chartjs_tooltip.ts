import { BubbleDataPoint, Point, TooltipItem, TooltipOptions } from "chart.js";
import { _DeepPartialObject } from "chart.js/dist/types/utils";
import { toNumber } from "../../../../functions/helpers";
import { CellValue } from "../../../../types";
import {
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  GenericDefinition,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { formatValue } from "../../../format/format";
import { isNumber } from "../../../numbers";
import { TREND_LINE_XAXIS_ID, formatChartDatasetValue } from "../chart_common";

type ChartTooltip = _DeepPartialObject<TooltipOptions<any>>;

export function getBarChartTooltip(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  return {
    callbacks: {
      title: function (tooltipItems) {
        return tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID)
          ? undefined
          : "";
      },
      label: function (tooltipItem) {
        const xLabel = tooltipItem.dataset?.label || tooltipItem.label;
        const horizontalChart = definition.horizontal;
        let yLabel = horizontalChart ? tooltipItem.parsed.x : tooltipItem.parsed.y;
        if (yLabel === undefined || yLabel === null) {
          yLabel = tooltipItem.parsed;
        }

        const axisId = horizontalChart ? tooltipItem.dataset.xAxisID : tooltipItem.dataset.yAxisID;
        const yLabelStr = formatChartDatasetValue(args.axisFormats, args.locale)(yLabel, axisId);
        return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
}

export function getLineChartTooltip(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { axisType, locale, axisFormats } = args;
  const labelFormat = axisFormats?.x;

  const tooltip: ChartTooltip = { callbacks: {} };

  if (axisType === "linear") {
    tooltip.callbacks!.label = (tooltipItem) => {
      const dataSetPoint = tooltipItem.parsed.y as CellValue;
      let label = tooltipItem.parsed.x as CellValue;
      if (typeof label === "string" && isNumber(label, locale)) {
        label = toNumber(label, locale);
      }
      const formattedX = formatValue(label, { locale, format: labelFormat });
      const axisId = tooltipItem.dataset.yAxisID || "y";
      const formattedY = formatValue(dataSetPoint, { locale, format: axisFormats?.[axisId] });
      const dataSetTitle = tooltipItem.dataset.label;
      return formattedX
        ? `${dataSetTitle}: (${formattedX}, ${formattedY})`
        : `${dataSetTitle}: ${formattedY}`;
    };
  } else {
    tooltip.callbacks!.label = function (tooltipItem) {
      const xLabel = tooltipItem.dataset?.label || tooltipItem.label;
      const yLabel = tooltipItem.parsed.y;

      const axisId = tooltipItem.dataset.yAxisID;
      const yLabelStr = formatChartDatasetValue(axisFormats, locale)(yLabel, axisId);
      return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
    };
  }

  tooltip.callbacks!.title = function (tooltipItems) {
    const displayTooltipTitle =
      axisType !== "linear" &&
      tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID);
    return displayTooltipTitle ? undefined : "";
  };

  return tooltip;
}

export function getPieChartTooltip(
  definition: PieChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { locale, axisFormats } = args;
  const format = axisFormats?.y || axisFormats?.y1;
  return {
    callbacks: {
      title: function (tooltipItems) {
        return tooltipItems[0].dataset.label;
      },
      label: function (tooltipItem) {
        const data = tooltipItem.dataset.data;
        const dataIndex = tooltipItem.dataIndex;
        const percentage = calculatePercentage(data, dataIndex);

        const xLabel = tooltipItem.label || tooltipItem.dataset.label;
        const yLabel = tooltipItem.parsed.y ?? tooltipItem.parsed;
        const toolTipFormat = !format && yLabel >= 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });

        return xLabel
          ? `${xLabel}: ${yLabelStr} (${percentage}%)`
          : `${yLabelStr} (${percentage}%)`;
      },
    },
  };
}

export function getWaterfallChartTooltip(
  definition: WaterfallChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { dataSetsValues, locale, axisFormats, labels } = args;
  const format = axisFormats?.y || axisFormats?.y1;
  const dataSeriesLabels = dataSetsValues.map((dataSet) => dataSet.label);
  return {
    callbacks: {
      label: function (tooltipItem) {
        const [lastValue, currentValue] = tooltipItem.raw as [number, number];
        const yLabel = currentValue - lastValue;
        const dataSeriesIndex = labels.length
          ? Math.floor(tooltipItem.dataIndex / labels.length)
          : 0;
        const dataSeriesLabel = dataSeriesLabels[dataSeriesIndex];
        const toolTipFormat = !format && Math.abs(yLabel) > 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });
        return dataSeriesLabel ? `${dataSeriesLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
}

export function getPyramidChartTooltip(
  definition: PyramidChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const tooltip = getBarChartTooltip(definition, args);
  return {
    ...tooltip,
    callbacks: {
      ...tooltip.callbacks,
      label: (item) => {
        const tooltipItem = { ...item, parsed: { y: item.parsed.y, x: Math.abs(item.parsed.x) } };
        return (tooltip?.callbacks?.label as any)(tooltipItem);
      },
    },
  };
}

export function getRadarChartTooltip(
  definition: RadarChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { locale, axisFormats } = args;
  return {
    callbacks: {
      label: function (tooltipItem) {
        const xLabel = tooltipItem.dataset?.label || tooltipItem.label;
        const yLabel = tooltipItem.parsed.r;
        const formattedY = formatValue(yLabel, { format: axisFormats?.r, locale });
        return xLabel ? `${xLabel}: ${formattedY}` : formattedY;
      },
    },
  };
}

export function getGeoChartTooltip(
  definition: GeoChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { locale, axisFormats } = args;
  const format = axisFormats?.y || axisFormats?.y1;
  return {
    filter: function (tooltipItem: TooltipItem<"choropleth">) {
      return (tooltipItem.raw as any).value !== undefined;
    },
    callbacks: {
      label: function (tooltipItem: TooltipItem<"choropleth">) {
        const rawItem = tooltipItem.raw as any;
        const xLabel = rawItem.feature.properties.name;
        const yLabel = rawItem.value;
        const toolTipFormat = !format && Math.abs(yLabel) >= 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });
        return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
}

function calculatePercentage(
  dataset: (number | [number, number] | Point | BubbleDataPoint | null)[],
  dataIndex: number
): string {
  const numericData: number[] = dataset.filter((value) => typeof value === "number") as number[];
  const total = numericData.reduce((sum, value) => sum + value, 0);

  if (!total) {
    return "";
  }
  const percentage = ((dataset[dataIndex] as number) / total) * 100;

  return percentage.toFixed(2);
}
