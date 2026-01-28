import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "@odoo/o-spreadsheet-engine/constants";
import { ColorGenerator } from "@odoo/o-spreadsheet-engine/helpers/color";
import {
  chartFontColor,
  getPieColors,
  isTrendLineAxis,
  truncateLabel,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import {
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  GenericDefinition,
  LineChartDefinition,
  PieChartDefinition,
  SunburstChartDefinition,
  SunburstChartJSDataset,
  WaterfallChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { ComboChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { RadarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { Chart, Color, LegendItem, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";

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
  definition: GenericDefinition<PieChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const { dataSetsValues } = args;
  const dataSetsLength = Math.max(0, ...dataSetsValues.map((ds) => ds?.data?.length ?? 0));
  const colors = getPieColors(
    new ColorGenerator(dataSetsLength, definition.slicesColors),
    dataSetsValues
  );
  const fontColor = chartFontColor(definition.background);
  return {
    ...getLegendDisplayOptions(definition, args),
    labels: {
      usePointStyle: true,
      generateLabels: (c) =>
        (
          c.data.labels?.map((label, index) => ({
            text: truncateLabel(String(label)),
            strokeStyle: colors[index],
            fillStyle: colors[index],
            pointStyle: "rect" as const,
            lineWidth: 2,
            fontColor,
          })) || []
        ).filter((label) => label.text),
      filter: (legendItem, data) => {
        return "datasetIndex" in legendItem
          ? !data.datasets[legendItem.datasetIndex!].hidden
          : true;
      },
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
    ...getCustomLegendLabels(chartFontColor(definition.background), {
      pointStyle: "circle",
      // the stroke is the border around the circle, so increasing its size with the chart's color reduce the size of the circle
      strokeStyle: definition.background || "#ffffff",
      lineWidth: 8,
    }),
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
      filter: (legendItem, data) => {
        return "datasetIndex" in legendItem
          ? !data.datasets[legendItem.datasetIndex!].hidden
          : true;
      },
    },
    onClick: () => {}, // Disables click interaction with the waterfall chart legend items
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

export function getSunburstChartLegend(
  definition: SunburstChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartLegend {
  const fontColor = chartFontColor(definition.background);

  return {
    ...getLegendDisplayOptions(definition, args),
    labels: {
      usePointStyle: true,
      generateLabels: (chart) => {
        const rootDataset = chart.data.datasets.at(-1) as SunburstChartJSDataset;
        if (!rootDataset) {
          return [];
        }
        const colors = rootDataset.groupColors;

        return colors.map(({ color, label }) => {
          return {
            text: truncateLabel(label),
            fontColor,
            fillStyle: color,
            strokeStyle: color,
            pointStyle: "rect" as const,
          };
        });
      },
    },
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
    if (event.type !== "click") {
      return;
    }
    const index = legendItem.datasetIndex;
    if (!legend.legendItems || index === undefined) {
      return;
    }
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
    filter?: LegendOptions<any>["labels"]["filter"];
  };
} {
  return {
    labels: {
      color: fontColor,
      usePointStyle: true,
      generateLabels: (chart: Chart) =>
        chart.data.datasets
          .map((dataset, index) => {
            if (isTrendLineAxis(dataset["xAxisID"])) {
              return {
                text: truncateLabel(dataset.label),
                fontColor,
                strokeStyle: dataset.borderColor as Color,
                hidden: !chart.isDatasetVisible(index),
                pointStyle: "line" as const,
                datasetIndex: index,
                lineWidth: 3,
              } as LegendItem;
            }
            return {
              text: truncateLabel(dataset.label),
              fontColor,
              strokeStyle: dataset.borderColor as Color,
              fillStyle: dataset.backgroundColor as Color,
              hidden: !chart.isDatasetVisible(index),
              pointStyle: dataset.type === "line" ? "line" : "rect",
              datasetIndex: index,
              ...legendLabelConfig,
            } as LegendItem;
          })
          .filter((label) => label.text),
      filter: (legendItem, data) => {
        return "datasetIndex" in legendItem
          ? !data.datasets[legendItem.datasetIndex!].hidden
          : true;
      },
    },
  };
}
