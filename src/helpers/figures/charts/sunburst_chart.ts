import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  SunburstChartDefinition,
  SunburstChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import type { ChartConfiguration, ChartOptions } from "chart.js";
import { CommandResult, Getters, Range, UID } from "../../../types";
import {
  getChartTitle,
  getHierarchalChartData,
  getSunburstChartDatasets,
  getSunburstChartLegend,
  getSunburstChartTooltip,
  getSunburstShowValues,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class SunburstChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "sunburst";

  static allowedDefinitionKeys: readonly (keyof SunburstChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "showLabels",
    "valuesDesign",
    "groupColors",
    "pieHolePercentage",
  ] as const;

  constructor(private definition: SunburstChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition.dataSource);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: SunburstChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): SunburstChartDefinition {
    let labelRange = context.dataSource?.dataSets?.[0]?.dataRange;
    if (!labelRange) {
      labelRange = context.auxiliaryRange;
    }
    let dataSource: ChartRangeDataSource = {
      type: "range",
      dataSetsHaveTitle: false,
      ...context.dataSource,
      dataSets: [],
      labelRange,
    };
    if (context.hierarchicalDataSource?.dataSets.length) {
      dataSource = context.hierarchicalDataSource;
    } else if (context.auxiliaryRange) {
      dataSource = {
        ...dataSource,
        dataSets: [{ dataRange: context.auxiliaryRange, dataSetId: "0" }],
      };
    }

    return {
      background: context.background,
      dataSetStyles: context.dataSetStyles ?? {},
      dataSource,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "sunburst",
      showValues: context.showValues,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      groupColors: context.groupColors,
      humanize: context.humanize,
      pieHolePercentage: context.pieHolePercentage,
    };
  }

  getDefinition(): SunburstChartDefinition {
    return this.getDefinitionWithSpecificDataSets({
      ...this.definition.dataSource,
      dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
        dataSetId,
        dataRange: this.getters.getRangeString(dataRange, this.sheetId),
      })),
      labelRange: this.labelRange && this.getters.getRangeString(this.labelRange, this.sheetId),
    });
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    const leafRange = definition.dataSource.dataSets.at(-1)?.dataRange;
    const dataSetsHaveTitle = this.definition.dataSource.dataSetsHaveTitle;
    return {
      ...definition,
      dataSource: definition.dataSource.labelRange
        ? {
            type: "range",
            dataSets: [{ dataRange: definition.dataSource.labelRange, dataSetId: "0" }],
            dataSetsHaveTitle,
          }
        : { type: "range", dataSets: [], dataSetsHaveTitle },
      auxiliaryRange: leafRange,
      hierarchicalDataSource: definition.dataSource,
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource
  ): SunburstChartDefinition {
    return {
      ...this.definition,
      dataSource,
    };
  }

  copyInSheetId(sheetId: UID): SunburstChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new SunburstChart(definition, sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(adapterFunctions: RangeAdapterFunctions): SunburstChart {
    const { dataSource, isStale } = updateChartRangesWithDataSets(
      this.sheetId,
      adapterFunctions,
      this.definition.dataSource
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new SunburstChart(definition, this.sheetId, this.getters);
  }
}

export function createSunburstChartRuntime(
  getters: Getters,
  chart: SunburstChart,
  data: ChartData
): SunburstChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getHierarchalChartData(definition, data, getters);

  const config: ChartConfiguration<"doughnut"> = {
    type: "doughnut",
    data: {
      datasets: getSunburstChartDatasets(definition, chartData),
    },
    options: {
      cutout:
        definition.pieHolePercentage === undefined ? "25%" : `${definition.pieHolePercentage}%`,
      ...(CHART_COMMON_OPTIONS as ChartOptions<"doughnut">),
      layout: getChartLayout(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getSunburstChartLegend(definition, chartData),
        tooltip: getSunburstChartTooltip(definition, chartData),
        sunburstLabelsPlugin: getSunburstShowValues(definition, chartData),
        sunburstHoverPlugin: { enabled: true },
      },
    },
  };

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
