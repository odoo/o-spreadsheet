import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
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
import { CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
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
    "dataSetsHaveTitle",
    "labelRange",
    "showValues",
    "showLabels",
    "valuesDesign",
    "groupColors",
    "pieHolePercentage",
  ] as const;

  constructor(private definition: SunburstChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: SunburstChartDefinition,
    applyChange: RangeAdapter
  ): SunburstChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: SunburstChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): SunburstChartDefinition {
    let labelRange = context.dataSource?.dataSets[0]?.dataRange;
    if (!labelRange) {
      labelRange = context.auxiliaryRange;
    }
    let dataSource: ChartRangeDataSource = {
      ...context.dataSource,
      dataSets: [],
    };
    if (context.hierarchicalDataSource?.dataSets.length) {
      dataSource = context.hierarchicalDataSource;
    } else if (context.auxiliaryRange) {
      dataSource = {
        ...context.dataSource,
        dataSets: [{ dataRange: context.auxiliaryRange, dataSetId: "0" }],
      };
    }

    return {
      background: context.background,
      dataSetStyles: context.dataSetStyles ?? {},
      dataSource,
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "sunburst",
      labelRange,
      showValues: context.showValues,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      groupColors: context.groupColors,
      humanize: context.humanize,
      pieHolePercentage: context.pieHolePercentage,
    };
  }

  getDefinition(): SunburstChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      {
        dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
          dataSetId,
          dataRange: this.getters.getRangeString(dataRange, this.sheetId),
        })),
      },
      this.labelRange
    );
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    const leafRange = definition.dataSource.dataSets.at(-1)?.dataRange;
    return {
      ...definition,
      dataSource: definition.labelRange
        ? { dataSets: [{ dataRange: definition.labelRange, dataSetId: "0" }] }
        : { dataSets: [] },
      auxiliaryRange: leafRange,
      hierarchicalDataSource: definition.dataSource,
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource,
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): SunburstChartDefinition {
    return {
      ...this.definition,
      dataSource,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): SunburstChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, labelRange, newSheetId);
    return new SunburstChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): SunburstChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, this.labelRange, sheetId);
    return new SunburstChart(definition, sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): SunburstChart {
    const { dataSource, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.definition.dataSource,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, labelRange);
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
