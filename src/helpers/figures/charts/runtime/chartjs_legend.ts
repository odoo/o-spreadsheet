import { Chart, Color, LegendItem, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../constants";
import { _t } from "../../../../translation";
import {
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  GenericDefinition,
  LineChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { ColorGenerator } from "../../../color";
import { chartFontColor, getPieColors } from "../chart_common";

type ChartLegend = DeepPartial<LegendOptions<any>>;

function getLegendDisplayOptions(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  return {
    display: definition.legendPosition !== "none",
    position: definition.legendPosition !== "none" ? definition.legendPosition : undefined,
  };
}

export function getBarChartLegend(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  return {
    ...INTERACTIVE_LEGEND_CONFIG,
    ...getLegendDisplayOptions(definition, args),
    ...getCustomLegendLabels(chartFontColor(definition.background), {
      pointStyle: "rect",
      lineWidth: 3,
    }),
  };
}

export function getLineChartLegend(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const filled = definition.fillArea;
  const pointStyle = filled ? "rect" : "line";
  const lineWidth = filled ? 2 : 3;
  return {
    ...INTERACTIVE_LEGEND_CONFIG,
    ...getLegendDisplayOptions(definition, args),
    ...getCustomLegendLabels(chartFontColor(definition.background), {
      pointStyle,
      lineWidth,
    }),
  };
}

export function getPieChartLegend(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const { dataSetsValues } = args;
  const dataSetsLength = Math.max(0, ...dataSetsValues.map((ds) => ds?.data?.length ?? 0));
  const colors = getPieColors(new ColorGenerator(dataSetsLength), dataSetsValues);
  return {
    ...getLegendDisplayOptions(definition, args),
    labels: {
      color: chartFontColor(definition.background),
      usePointStyle: true,
      //@ts-ignore
      generateLabels: (c) =>
        //@ts-ignore
        c.data.labels.map((label, index) => ({
          text: label,
          strokeStyle: colors[index],
          fillStyle: colors[index],
          pointStyle: "rect",
          hidden: false,
          lineWidth: 2,
        })),
    },
  };
}

export function getScatterChartLegend(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  return {
    ...INTERACTIVE_LEGEND_CONFIG,
    ...getLegendDisplayOptions(definition, args),
    labels: {
      color: chartFontColor(definition.background),
      boxHeight: 6,
      usePointStyle: true,
    },
  };
}

export function getComboChartLegend(
  definition: GenericDefinition<ComboChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  return {
    ...INTERACTIVE_LEGEND_CONFIG,
    ...getLegendDisplayOptions(definition, args),
    ...getCustomLegendLabels(chartFontColor(definition.background), {
      lineWidth: 3,
    }),
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
    ...getLegendDisplayOptions(definition, args),
    labels: {
      usePointStyle: true,
      generateLabels: () => {
        const legendValues = [
          {
            text: _t("Positive values"),
            fontColor,
            fillStyle: positiveColor,
            strokeStyle: positiveColor,
            pointStyle: "rect" as const,
          },
          {
            text: _t("Negative values"),
            fontColor,
            fillStyle: negativeColor,
            strokeStyle: negativeColor,
            pointStyle: "rect" as const,
          },
        ];
        if (definition.showSubTotals || definition.firstValueAsSubtotal) {
          legendValues.push({
            text: _t("Subtotals"),
            fontColor,
            fillStyle: subTotalColor,
            strokeStyle: subTotalColor,
            pointStyle: "rect" as const,
          });
        }
        return legendValues;
      },
    },
  };
}

export function getRadarChartLegend(
  definition: GenericDefinition<RadarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const fill = definition.fillArea ?? false;
  const pointStyle = fill ? "rect" : "line";
  const lineWidth = fill ? 2 : 3;
  return {
    ...INTERACTIVE_LEGEND_CONFIG,
    ...getLegendDisplayOptions(definition, args),
    ...getCustomLegendLabels(chartFontColor(definition.background), {
      pointStyle,
      lineWidth,
    }),
  };
}

/* Callback used to make the legend interactive
 * These are used to make the user able to hide/show a data series by
 * clicking on the corresponding label in the legend. The onHover and
 * onLeave callbacks are used to show a pointer when hovering an item
 * of the legend so that the user knows it is clickable.
 */
export const INTERACTIVE_LEGEND_CONFIG = {
  onHover: (event) => {
    const target = event.native?.target;
    if (!target) {
      return;
    }
    //@ts-ignore
    target.style.cursor = "pointer";
  },
  onLeave: (event) => {
    const target = event.native?.target;
    if (!target) {
      return;
    }
    //@ts-ignore
    target.style.cursor = "default";
  },
  onClick: (event, legendItem, legend) => {
    if (!legend.legendItems) {
      return;
    }
    const index = legend.legendItems.indexOf(legendItem);
    if (legend.chart.isDatasetVisible(index)) {
      legend.chart.hide(index);
    } else {
      legend.chart.show(index);
    }
    event.native.preventDefault();
    event.native.stopPropagation();
  },
};

function getCustomLegendLabels(
  fontColor: Color,
  legendLabelConfig: Partial<LegendItem>
): {
  labels: {
    color: Color;
    usePointStyle: boolean;
    generateLabels: (chart: Chart) => LegendItem[];
  };
} {
  return {
    labels: {
      color: fontColor,
      usePointStyle: true,
      generateLabels: (chart: Chart) =>
        chart.data.datasets.map((dataset, index) => ({
          text: dataset.label ?? "",
          fontColor,
          strokeStyle: dataset.borderColor as Color,
          fillStyle: dataset.backgroundColor as Color,
          hidden: !chart.isDatasetVisible(index),
          pointStyle: dataset.type === "line" ? "line" : "rect",
          ...legendLabelConfig,
        })),
    },
  };
}
