import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { setColorAlpha } from "@odoo/o-spreadsheet-engine/helpers/color";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  shouldRemoveFirstLabel,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  ChartCreationContext,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart/common_chart";
import {
  PieChartDefinition,
  PieChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/pie_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type {
  ActiveElement,
  Chart,
  ChartConfiguration,
  ChartDataset,
  ChartEvent,
  LegendElement,
  LegendItem,
} from "chart.js";
import {
  ApplyRangeChange,
  Color,
  CommandResult,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getPieChartData,
  getPieChartDatasets,
  getPieChartLegend,
  getPieChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class PieChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "pie";
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly isDoughnut?: boolean;
  readonly showValues?: boolean;
  readonly pieHolePercentage?: number;
  lastHoveredIndex: number | undefined = undefined;

  constructor(definition: PieChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.isDoughnut = definition.isDoughnut;
    this.showValues = definition.showValues;
    this.pieHolePercentage = definition.pieHolePercentage;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: PieChartDefinition,
    applyChange: RangeAdapter
  ): PieChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: PieChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): PieChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pie",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
      isDoughnut: context.isDoughnut,
      pieHolePercentage: context.pieHolePercentage,
      showValues: context.showValues,
      humanize: context.humanize,
    };
  }

  getDefinition(): PieChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getContextCreation(): ChartCreationContext {
    return {
      ...this,
      range: this.dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, this.sheetId),
      })),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): PieChartDefinition {
    return {
      type: "pie",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId),
      })),
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      aggregated: this.aggregated,
      isDoughnut: this.isDoughnut,
      showValues: this.showValues,
      pieHolePercentage: this.pieHolePercentage,
      humanize: this.humanize,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): PieChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new PieChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PieChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new PieChart(definition, sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(
      this.labelRange,
      this.dataSets,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    return {
      ...this.getDefinition(),
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
    };
  }

  updateRanges(applyChange: ApplyRangeChange): PieChart {
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new PieChart(definition, this.sheetId, this.getters);
  }

  highlightItem(index: number, dataSets: ChartDataset[]) {
    dataSets.forEach((dataset) => {
      const backgroundColors = dataset.backgroundColor as Color[] | undefined;
      if (!backgroundColors) {
        return;
      }
      backgroundColors.forEach((color, i, colors) => {
        colors[i] = setColorAlpha(color, i === index ? 1 : 0.4);
      });
    });
  }

  unHighlightItems(dataSets: ChartDataset[]) {
    dataSets.forEach((dataset) => {
      const backgroundColors = dataset.backgroundColor as Color[] | undefined;
      if (!backgroundColors) {
        return;
      }
      backgroundColors.forEach((color, i, colors) => {
        colors[i] = setColorAlpha(color, 1);
      });
    });
  }

  onHoverLegend(evt: ChartEvent, item: LegendItem, legend: LegendElement<"doughnut" | "pie">) {
    if (item.index === undefined) {
      return;
    }
    const datasets = legend.chart.data.datasets;
    this.highlightItem(item.index, datasets);
    legend.chart.update();
  }

  onLeaveLegend(evt: ChartEvent, item: LegendItem, legend: LegendElement<"doughnut" | "pie">) {
    const datasets = legend.chart.data.datasets;
    this.unHighlightItems(datasets);
    legend.chart.update();
  }

  onHover(evt: ChartEvent, items: ActiveElement[], chart: Chart) {
    const datasets = chart.data.datasets;
    if (items[0]) {
      if (items[0].index !== this.lastHoveredIndex) {
        this.highlightItem(items[0].index, datasets);
        this.lastHoveredIndex = items[0].index;
      }
    } else if (this.lastHoveredIndex !== undefined) {
      this.unHighlightItems(datasets);
      this.lastHoveredIndex = undefined;
    }
    chart.update();
  }
}

export function createPieChartRuntime(chart: PieChart, getters: Getters): PieChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getPieChartData(definition, chart.dataSets, chart.labelRange, getters);

  const config: ChartConfiguration<"doughnut" | "pie"> = {
    type: chart.isDoughnut ? "doughnut" : "pie",
    data: {
      labels: chartData.labels,
      datasets: getPieChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      cutout:
        chart.isDoughnut && definition.pieHolePercentage !== undefined
          ? definition.pieHolePercentage + "%"
          : undefined,
      layout: getChartLayout(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: {
          ...getPieChartLegend(definition, chartData),
          onHover: chart.onHoverLegend.bind(chart),
          onLeave: chart.onLeaveLegend.bind(chart),
        },
        tooltip: getPieChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
        //@ts-ignore
        ["eventPlugin"]: {
          events: ["mouseout"],
        },
      },
      onHover: chart.onHover.bind(chart),
    },
    plugins: [
      {
        id: "eventPlugin",
        afterEvent(c, args, _) {
          if (args.event.type === "mouseout") {
            chart.unHighlightItems(c.data.datasets);
            c.update();
            chart.lastHoveredIndex = undefined;
          }
        },
      },
    ],
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
