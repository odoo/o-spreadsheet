import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  TreeMapChartDefinition,
  TreeMapChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getChartTitle,
  getHierarchalChartData,
  getTreeMapChartDatasets,
  getTreeMapChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class TreeMapChart extends AbstractChart {
  static defaults = {
    background: BACKGROUND_CHART_COLOR,
    legendPosition: "top",
    dataSetsHaveTitle: false,
    showHeaders: true,
    headersColor: "#000000",
  };
  readonly type = "treemap";

  static allowedDefinitionKeys: readonly (keyof TreeMapChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showHeaders",
    "headerDesign",
    "showLabels",
    "valuesDesign",
    "coloringOptions",
    "showValues",
  ] as const;

  constructor(
    private definition: TreeMapChartDefinition<Range>,
    sheetId: UID,
    getters: CoreGetters
  ) {
    super(sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): TreeMapChartDefinition<string> {
    let dataSource: ChartRangeDataSource<string> = {
      type: "range",
      dataSets: [],
      dataSetsHaveTitle: context.dataSource?.dataSetsHaveTitle ?? false,
      labelRange: context.dataSource?.dataSets?.[0]?.dataRange,
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
      type: "treemap",
      showValues: context.showValues,
      showHeaders: context.showHeaders,
      headerDesign: context.headerDesign,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      coloringOptions: context.treemapColoringOptions,
      humanize: context.humanize,
    };
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: TreeMapChartDefinition<string>
  ): ChartCreationContext {
    return {
      ...definition,
      treemapColoringOptions: definition.coloringOptions,
      ...dataSource.getHierarchicalContextCreation(
        dataSource.getDefinition(this.getters, this.sheetId)
      ),
    };
  }

  getRangeDefinition(): TreeMapChartDefinition {
    return this.definition;
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  getRuntime(getters: Getters, data: ChartData): TreeMapChartRuntime {
    const definition = this.definition;
    const chartData = getHierarchalChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "treemap",
      data: {
        labels: chartData.labels,
        datasets: getTreeMapChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: { display: false },
          tooltip: getTreeMapChartTooltip(definition, chartData),
        },
      },
    };

    return {
      chartJsConfig: config,
      background: definition.background || BACKGROUND_CHART_COLOR,
    };
  }
}
