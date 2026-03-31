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
  SunburstChartDefinition,
  SunburstChartRawData,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { TreeMapChartDefinition } from "../../../../types/chart/tree_map_chart";
import { setColorAlpha } from "../../../color";
import { formatOrHumanizeValue, humanizeNumber } from "../../../format/format";
import { isNumber } from "../../../numbers";
import { formatChartDatasetValue, isTrendLineAxis } from "../chart_common";
import { renderToString } from "./chart_custom_tooltip";
import { GHOST_SUNBURST_VALUE } from "./chartjs_dataset";

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
        return tooltipItems.some((item) => !isTrendLineAxis(item.dataset.xAxisID)) ? undefined : "";
      },
      beforeLabel: (tooltipItem) => tooltipItem.dataset?.label || tooltipItem.label,
      label: function (tooltipItem) {
        const horizontalChart = definition.horizontal;
        let yLabel = horizontalChart ? tooltipItem.parsed.x : tooltipItem.parsed.y;
        if (yLabel === undefined || yLabel === null) {
          yLabel = tooltipItem.parsed;
        }

        const axisId = horizontalChart ? tooltipItem.dataset.xAxisID : tooltipItem.dataset.yAxisID;
        const yLabelStr = formatChartDatasetValue(
          args.axisFormats,
          args.locale,
          definition.humanize
        )(yLabel, axisId);
        return yLabelStr;
      },
    },
  };
}

export function getCalendarChartTooltip(
  definition: CalendarChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { locale, axisFormats } = args;
  return {
    enabled: false,
    filter: (tooltipItem) => tooltipItem.dataset.values[tooltipItem.dataIndex] !== undefined,
    external: customTooltipHandler,
    callbacks: {
      title: (_) => "",
      beforeLabel: (tooltipItem) => {
        return `${tooltipItem.dataset?.label}, ${tooltipItem.label}`;
      },
      label: function (tooltipItem) {
        const yLabel = tooltipItem.dataset.values[tooltipItem.dataIndex];
        return humanizeNumber({ value: yLabel, format: axisFormats?.y }, locale);
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
      let label = isTrendLineAxis(tooltipItem.dataset.xAxisID)
        ? ""
        : (tooltipItem.parsed.x as CellValue);

      if (typeof label === "string" && isNumber(label, locale)) {
        label = toNumber(label, locale);
      }
      const formattedX = formatOrHumanizeValue(label, labelFormat, locale, definition.humanize);
      const axisId = tooltipItem.dataset.yAxisID || "y";
      const formattedY = formatOrHumanizeValue(
        dataSetPoint,
        axisFormats?.[axisId],
        locale,
        definition.humanize
      );
      return formattedX ? `(${formattedX}, ${formattedY})` : `${formattedY}`;
    };
  } else {
    tooltip.callbacks!.label = function (tooltipItem) {
      const yLabel = tooltipItem.parsed.y;

      const axisId = tooltipItem.dataset.yAxisID;
      const yLabelStr = formatChartDatasetValue(
        axisFormats,
        locale,
        definition.humanize
      )(yLabel, axisId);
      return yLabelStr;
    };
  }

  tooltip.callbacks!.beforeLabel = (tooltipItem) => tooltipItem.dataset?.label || tooltipItem.label;
  tooltip.callbacks!.title = function (tooltipItems) {
    const displayTooltipTitle =
      axisType !== "linear" && tooltipItems.some((item) => !isTrendLineAxis(item.dataset.xAxisID));
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
        const yLabelStr = formatOrHumanizeValue(yLabel, toolTipFormat, locale, definition.humanize);

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
        return formatOrHumanizeValue(yLabel, toolTipFormat, locale, definition.humanize);
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
        return formatOrHumanizeValue(yLabel, axisFormats?.r, locale, definition.humanize);
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
        return formatOrHumanizeValue(yLabel, toolTipFormat, locale, definition.humanize);
      },
    },
  };
}

export function getFunnelChartTooltip(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  return {
    enabled: false,
    external: customTooltipHandler,
    position: "funnelTooltipPositioner",
    callbacks: {
      title: () => "",
      beforeLabel: (tooltipItem) => tooltipItem.label,
      label: function (tooltipItem) {
        const yLabel = tooltipItem.parsed.x;
        const axisId = tooltipItem.dataset.xAxisID;
        const yLabelStr = formatChartDatasetValue(
          args.axisFormats,
          args.locale,
          definition.humanize
        )(yLabel, axisId);
        return yLabelStr;
      },
    },
  };
}

export function getSunburstChartTooltip(
  definition: SunburstChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { locale, axisFormats } = args;
  const format = axisFormats?.y || axisFormats?.y1;
  return {
    enabled: false,
    external: customTooltipHandler,
    filter: function (tooltipItem) {
      const data = tooltipItem.raw as SunburstChartRawData;
      return data?.label !== GHOST_SUNBURST_VALUE;
    },
    callbacks: {
      title: () => "",
      beforeLabel: (tooltipItem) => {
        const data = tooltipItem.raw as SunburstChartRawData;
        return data.groups.join(" / ");
      },
      label: function (tooltipItem) {
        const data = tooltipItem.raw as SunburstChartRawData;
        const yLabel = data.value;
        const toolTipFormat = !format && yLabel >= 1000 ? "#,##" : format;
        return formatOrHumanizeValue(yLabel, toolTipFormat, locale, definition.humanize);
      },
    },
  };
}

export function getTreeMapChartTooltip(
  definition: TreeMapChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartTooltip {
  const { locale, axisFormats } = args;
  const format = axisFormats?.y;
  return {
    enabled: false,
    external: customTooltipHandler,
    filter: (tooltipItem: any, index: number, tooltipItems: any[]) => {
      return index === tooltipItems.length - 1;
    },
    callbacks: {
      title: () => "",
      beforeLabel: (tooltipItem: any) => {
        const childElement = tooltipItem.raw._data.children[0];
        if (!childElement) {
          return "";
        }
        const path: string[] = [];
        for (let i = 0; i <= tooltipItem.raw.l; i++) {
          path.push(childElement[i]);
        }
        return path.join(" / ");
      },
      label: (tooltipItem: any) => {
        const yLabel = tooltipItem.raw.v;
        const toolTipFormat = !format && yLabel >= 1000 ? "#,##" : format;
        return formatOrHumanizeValue(yLabel, toolTipFormat, locale, definition.humanize);
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
