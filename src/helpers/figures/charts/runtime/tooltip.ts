import { TooltipOptions } from "chart.js";
import { _DeepPartialObject } from "chart.js/dist/types/utils";
import { toNumber } from "../../../../functions/helpers";
import { Format, Locale } from "../../../../types";
import {
  AxisType,
  BarChartDefinition,
  ChartAxisFormats,
  CommonChartJSDefinition,
  DatasetValues,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboBarChartDefinition } from "../../../../types/chart/common_bar_combo";
import { formatValue } from "../../../format/format";
import { isNumber } from "../../../numbers";
import { TREND_LINE_XAXIS_ID, formatChartDatasetValue } from "../chart_common";
import { calculatePercentage } from "../pie_chart";
import {
  comboDefinitionToBar,
  pyramidDefinitionToBar,
  scatterDefinitionToLine,
} from "./convert_definition";

type ChartTooltip = _DeepPartialObject<TooltipOptions<any>>;
interface TooltipArgs {
  axisFormats: ChartAxisFormats;
  locale: Locale;
  axisType?: AxisType;
  labelFormat?: Format;
  labelValues?: string[];
  dataSetsValues: DatasetValues[];
  leftAxisFormat?: Format;
  dataSeriesLabels: (string | undefined)[];
}

export function getCommonChartTooltip(
  definition: CommonChartJSDefinition,
  args: TooltipArgs
): ChartTooltip {
  const horizontalChart = "horizontal" in definition && definition.horizontal; // ADRM TODO: maybe bar chart specific
  return {
    callbacks: {
      label: function (tooltipItem) {
        const xLabel = tooltipItem.dataset?.label || tooltipItem.label;
        // ADRM TODO: sure but this callback is never used for pie charts...
        // tooltipItem.parsed can be an object or a number for pie charts
        let yLabel = horizontalChart ? tooltipItem.parsed.x : tooltipItem.parsed.y;
        if (!yLabel) {
          yLabel = tooltipItem.parsed;
        }

        const axisId = horizontalChart ? tooltipItem.dataset.xAxisID : tooltipItem.dataset.yAxisID;
        const yLabelStr = formatChartDatasetValue(args.axisFormats, args.locale)(yLabel, axisId);
        return xLabel ? `${xLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
}

export function getBarChartTooltip(
  definition: BarChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  const commonTooltip = getCommonChartTooltip(definition, args);
  return {
    ...commonTooltip,
    callbacks: {
      ...commonTooltip.callbacks,
      title: function (tooltipItems) {
        return tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID)
          ? undefined
          : "";
      },
    },
  };
}

export function getLineChartTooltip(
  definition: LineChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  const { axisType, locale, dataSetsValues, labelFormat, labelValues, leftAxisFormat } = args;
  const tooltip = getCommonChartTooltip(definition, args);

  if (axisType === "linear") {
    tooltip!.callbacks!.label = (tooltipItem) => {
      const dataSetPoint = dataSetsValues[tooltipItem.datasetIndex!].data![tooltipItem.dataIndex!];
      let label: string | number = tooltipItem.label || labelValues?.values[tooltipItem.dataIndex!];
      if (typeof label !== "number" && isNumber(label, locale)) {
        label = toNumber(label, locale);
      }
      const formattedX = formatValue(label, { locale, format: labelFormat });
      const formattedY = formatValue(dataSetPoint, { locale, format: leftAxisFormat });
      const dataSetTitle = tooltipItem.dataset.label;
      return formattedX
        ? `${dataSetTitle}: (${formattedX}, ${formattedY})`
        : `${dataSetTitle}: ${formattedY}`;
    };
  }

  tooltip!.callbacks!.title = function (tooltipItems) {
    const displayTooltipTitle =
      axisType !== "linear" &&
      tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID);
    return displayTooltipTitle ? undefined : "";
  };

  return tooltip;
}

export function getPieChartTooltip(
  definition: PieChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  const { locale, leftAxisFormat } = args;
  return {
    ...getCommonChartTooltip(definition, args),
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
        const toolTipFormat = !leftAxisFormat && yLabel >= 1000 ? "#,##" : leftAxisFormat;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });

        return xLabel
          ? `${xLabel}: ${yLabelStr} (${percentage}%)`
          : `${yLabelStr} (${percentage}%)`;
      },
    },
  };
}

export function getComboBarChartTooltip(
  definition: ComboBarChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  return { ...getBarChartTooltip(comboDefinitionToBar(definition), args) };
}

export function getWaterfallChartTooltip(
  definition: WaterfallChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  const { dataSeriesLabels, locale, leftAxisFormat, labelValues } = args;
  return {
    callbacks: {
      label: function (tooltipItem) {
        const [lastValue, currentValue] = tooltipItem.raw as [number, number];
        const yLabel = currentValue - lastValue;
        const dataSeriesIndex = labelValues
          ? Math.floor(tooltipItem.dataIndex / labelValues.length)
          : 0;
        const dataSeriesLabel = dataSeriesLabels[dataSeriesIndex];
        const toolTipFormat = !leftAxisFormat && Math.abs(yLabel) > 1000 ? "#,##" : leftAxisFormat;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });
        return dataSeriesLabel ? `${dataSeriesLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
}

export function getPyramidChartTooltip(
  definition: PyramidChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  const tooltip = getBarChartTooltip(pyramidDefinitionToBar(definition), args);
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

export function getScatterChartTooltip(
  definition: ScatterChartDefinition,
  args: TooltipArgs
): ChartTooltip {
  return { ...getLineChartTooltip(scatterDefinitionToLine(definition), args) };
}
