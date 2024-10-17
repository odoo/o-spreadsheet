import { LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../constants";
import { _t } from "../../../../translation";
import {
  BarChartDefinition,
  CommonChartJSDefinition,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboBarChartDefinition } from "../../../../types/chart/common_bar_combo";
import { chartFontColor } from "../chart_common";
import {
  comboDefinitionToBar,
  pyramidDefinitionToBar,
  scatterDefinitionToLine,
  waterfallDefinitionToBar,
} from "./convert_definition";

type ChartLegend = DeepPartial<LegendOptions<any>>;
interface LegendArgs {}

export function getCommonChartLegend(
  definition: CommonChartJSDefinition, // ADRM TODO: maybe just a "legend" in definition
  args: LegendArgs
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

export function getBarChartLegend(definition: BarChartDefinition, args: LegendArgs): ChartLegend {
  return {
    ...getCommonChartLegend(definition, args),
  };
}

export function getLineChartLegend(definition: LineChartDefinition, args: LegendArgs): ChartLegend {
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

export function getPieChartLegend(definition: PieChartDefinition, args: LegendArgs): ChartLegend {
  return {
    ...getCommonChartLegend(definition, args),
  };
}

export function getComboBarChartLegend(
  definition: ComboBarChartDefinition,
  args: LegendArgs
): ChartLegend {
  return { ...getBarChartLegend(comboDefinitionToBar(definition), args) };
}

export function getWaterfallChartLegend(
  definition: WaterfallChartDefinition,
  args: LegendArgs
): ChartLegend {
  const fontColor = chartFontColor(definition.background);
  const negativeColor = definition.negativeValuesColor || CHART_WATERFALL_NEGATIVE_COLOR;
  const positiveColor = definition.positiveValuesColor || CHART_WATERFALL_POSITIVE_COLOR;
  const subTotalColor = definition.subTotalValuesColor || CHART_WATERFALL_SUBTOTAL_COLOR;

  return {
    ...getBarChartLegend(waterfallDefinitionToBar(definition), args),
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

export function getPyramidChartLegend(
  definition: PyramidChartDefinition,
  args: LegendArgs
): ChartLegend {
  return { ...getBarChartLegend(pyramidDefinitionToBar(definition), args) };
}

export function getScatterChartLegend(
  definition: ScatterChartDefinition,
  args: LegendArgs
): ChartLegend {
  return { ...getLineChartLegend(scatterDefinitionToLine(definition), args) };
}
