import { LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../constants";
import { _t } from "../../../../translation";
import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  LineChartDefinition,
  PartialDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { chartFontColor } from "../chart_common";

type ChartLegend = DeepPartial<LegendOptions<any>>;

export function getCommonChartLegend(
  definition: PartialDefinition<ChartWithDataSetDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  return {
    // Disable default legend onClick (show/hide dataset), to allow us to set a global onClick on the chart container.
    // If we want to re-enable this in the future, we need to override the default onClick to stop the event propagation
    onClick: () => {},
    display: definition.legendPosition !== "none",
    position: definition.legendPosition !== "none" ? definition.legendPosition : undefined,
    labels: { color: chartFontColor(definition.background) },
  };
}

export function getLineChartLegend(
  definition: PartialDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  return {
    ...getCommonChartLegend(definition, args),
    labels: {
      color: chartFontColor(definition.background),
      generateLabels: (chart) => {
        // color the legend labels with the dataset color, without any transparency
        const { data } = chart;
        const labels = window.Chart.defaults.plugins.legend.labels.generateLabels!(chart);
        for (const [index, label] of labels.entries()) {
          label.fillStyle = data.datasets![index].borderColor as string;
        }
        return labels;
      },
    },
  };
}

export function getWaterfallChartLegend(
  definition: WaterfallChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const fontColor = chartFontColor(definition.background);
  const negativeColor = definition.negativeValuesColor || CHART_WATERFALL_NEGATIVE_COLOR;
  const positiveColor = definition.positiveValuesColor || CHART_WATERFALL_POSITIVE_COLOR;
  const subTotalColor = definition.subTotalValuesColor || CHART_WATERFALL_SUBTOTAL_COLOR;

  return {
    ...getCommonChartLegend(definition, args),
    labels: {
      color: fontColor,
      generateLabels: () => {
        const legendValues = [
          {
            text: _t("Positive values"),
            fontColor,
            fillStyle: positiveColor,
            strokeStyle: positiveColor,
          },
          {
            text: _t("Negative values"),
            fontColor,
            fillStyle: negativeColor,
            strokeStyle: negativeColor,
          },
        ];
        if (definition.showSubTotals || definition.firstValueAsSubtotal) {
          legendValues.push({
            text: _t("Subtotals"),
            fontColor,
            fillStyle: subTotalColor,
            strokeStyle: subTotalColor,
          });
        }
        return legendValues;
      },
    },
  };
}

export function getRadarChartLegend(
  definition: PartialDefinition<RadarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const legend = getCommonChartLegend(definition, args);
  return {
    ...legend,
    labels: {
      ...legend.labels,
      boxHeight: definition.fillArea ? undefined : 0,
    },
  };
}
