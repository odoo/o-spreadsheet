import { BubbleDataPoint, Chart, Point, TooltipItem, TooltipModel, TooltipOptions } from "chart.js";
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
import { setColorAlpha } from "../../../color";
import { formatValue } from "../../../format/format";
import { isNumber } from "../../../numbers";
import { TREND_LINE_XAXIS_ID, formatChartDatasetValue } from "../chart_common";
import { renderToString } from "./chart_custom_tooltip";

type ChartTooltip = _DeepPartialObject<TooltipOptions<any>>;
type ChartContext = { chart: Chart; tooltip: TooltipModel<any> };

export function getBarChartTooltip(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  return {
    enabled: false,
    external: customTooltipHandler,
    callbacks: {
      title: function (tooltipItems) {
        return tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID)
          ? undefined
          : "";
      },
      beforeLabel: (tooltipItem) => tooltipItem.dataset?.label || tooltipItem.label,
      label: function (tooltipItem) {
        const horizontalChart = definition.horizontal;
        let yLabel = horizontalChart ? tooltipItem.parsed.x : tooltipItem.parsed.y;
        if (yLabel === undefined || yLabel === null) {
          yLabel = tooltipItem.parsed;
        }

        const axisId = horizontalChart ? tooltipItem.dataset.xAxisID : tooltipItem.dataset.yAxisID;
        const yLabelStr = formatChartDatasetValue(args.axisFormats, args.locale)(yLabel, axisId);
        return yLabelStr;
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

  const tooltip: ChartTooltip = {
    enabled: false,
    external: customTooltipHandler,
    callbacks: {},
  };

  if (axisType === "linear") {
    tooltip.callbacks!.label = (tooltipItem) => {
      const dataSetPoint = tooltipItem.parsed.y as CellValue;
      let label =
        tooltipItem.dataset.xAxisID === TREND_LINE_XAXIS_ID
          ? ""
          : (tooltipItem.parsed.x as CellValue);

      if (typeof label === "string" && isNumber(label, locale)) {
        label = toNumber(label, locale);
      }
      const formattedX = formatValue(label, { locale, format: labelFormat });
      const axisId = tooltipItem.dataset.yAxisID || "y";
      const formattedY = formatValue(dataSetPoint, { locale, format: axisFormats?.[axisId] });
      return formattedX ? `(${formattedX}, ${formattedY})` : `${formattedY}`;
    };
  } else {
    tooltip.callbacks!.label = function (tooltipItem) {
      const yLabel = tooltipItem.parsed.y;

      const axisId = tooltipItem.dataset.yAxisID;
      const yLabelStr = formatChartDatasetValue(axisFormats, locale)(yLabel, axisId);
      return yLabelStr;
    };
  }

  tooltip.callbacks!.beforeLabel = (tooltipItem) => tooltipItem.dataset?.label || tooltipItem.label;
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
    enabled: false,
    external: customTooltipHandler,
    callbacks: {
      title: function (tooltipItems) {
        return tooltipItems[0].dataset.label;
      },
      beforeLabel: (tooltipItem) => tooltipItem.label || tooltipItem.dataset.label,
      label: function (tooltipItem) {
        const data = tooltipItem.dataset.data;
        const dataIndex = tooltipItem.dataIndex;
        const percentage = calculatePercentage(data, dataIndex);

        const yLabel = tooltipItem.parsed.y ?? tooltipItem.parsed;
        const toolTipFormat = !format && yLabel >= 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });

        return `${yLabelStr} (${percentage}%)`;
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
    enabled: false,
    external: customTooltipHandler,
    callbacks: {
      beforeLabel: function (tooltipItem) {
        const dataSeriesIndex = labels.length
          ? Math.floor(tooltipItem.dataIndex / labels.length)
          : 0;
        return dataSeriesLabels[dataSeriesIndex];
      },
      label: function (tooltipItem) {
        const [lastValue, currentValue] = tooltipItem.raw as [number, number];
        const yLabel = currentValue - lastValue;
        const toolTipFormat = !format && Math.abs(yLabel) > 1000 ? "#,##" : format;
        return formatValue(yLabel, { format: toolTipFormat, locale });
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
    enabled: false,
    external: customTooltipHandler,
    callbacks: {
      beforeLabel: (tooltipItem) => tooltipItem.dataset?.label || tooltipItem.label,
      label: function (tooltipItem) {
        const yLabel = tooltipItem.parsed.r;
        return formatValue(yLabel, { format: axisFormats?.r, locale });
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
    enabled: false,
    external: customTooltipHandler,
    filter: function (tooltipItem: TooltipItem<"choropleth">) {
      return (tooltipItem.raw as any).value !== undefined;
    },
    callbacks: {
      beforeLabel: (tooltipItem) => (tooltipItem.raw as any).feature.properties.name,
      label: function (tooltipItem: TooltipItem<"choropleth">) {
        const rawItem = tooltipItem.raw as any;
        const yLabel = rawItem.value;
        const toolTipFormat = !format && Math.abs(yLabel) >= 1000 ? "#,##" : format;
        return formatValue(yLabel, { format: toolTipFormat, locale });
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

function customTooltipHandler({ chart, tooltip }: ChartContext) {
  chart.canvas.parentNode!.querySelector("div.o-chart-custom-tooltip")?.remove();
  if (tooltip.opacity === 0 || tooltip.dataPoints.length === 0) {
    return;
  }

  const tooltipItems = tooltip.body.map((body, index) => {
    let label = body.before[0];
    let value = body.lines[0];
    if (!value) {
      value = label;
      label = "";
    }

    const color = tooltip.labelColors[index].backgroundColor;
    return {
      label,
      value,
      boxColor: typeof color === "string" ? setColorAlpha(color, 1) : color,
    };
  });

  const innerHTML = renderToString("o-spreadsheet-CustomTooltip", {
    labelsMaxWidth: Math.floor(chart.canvas.clientWidth * 0.5) + "px",
    valuesMaxWidth: Math.floor(chart.canvas.clientWidth * 0.25) + "px",
    title: tooltip.title[0],
    tooltipItems,
  });
  const template = Object.assign(document.createElement("template"), { innerHTML });
  const newTooltipEl = template.content.firstChild as HTMLElement;

  chart.canvas.parentNode?.appendChild(newTooltipEl);

  Object.assign(newTooltipEl.style, {
    left: getTooltipLeftPosition(chart, tooltip, newTooltipEl.clientWidth) + "px",
    top: Math.floor(tooltip.caretY - newTooltipEl.clientHeight / 2) + "px",
  });
}

/**
 * Get the left position for the tooltip, making sure it doesn't go out of the chart area.
 */
function getTooltipLeftPosition(chart: Chart, tooltip: TooltipModel<any>, tooltipWidth: number) {
  const x = tooltip.caretX;
  if (x + tooltipWidth > chart.chartArea.right) {
    return Math.max(0, x - tooltipWidth);
  }
  return x;
}
