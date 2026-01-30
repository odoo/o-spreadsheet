import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import {
  SunburstChartDefinition,
  SunburstChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import type { ChartConfiguration, ChartOptions } from "chart.js";
import { Getters, Range, UID } from "../../../types";
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

  constructor(
    private definition: SunburstChartDefinition<Range>,
    sheetId: UID,
    getters: CoreGetters
  ) {
    super(definition, sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): SunburstChartDefinition<string> {
    let labelRange = context.dataSource?.dataSets?.[0]?.dataRange;
    if (!labelRange) {
      labelRange = context.auxiliaryRange;
    }
    let dataSource: ChartRangeDataSource<string> = {
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

  getRangeDefinition(): SunburstChartDefinition {
    return this.definition;
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: SunburstChartDefinition<string>
  ): ChartCreationContext {
    return {
      ...definition,
      ...dataSource.getHierarchicalContextCreation(
        dataSource.getDefinition(this.getters, this.sheetId)
      ),
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  getRuntime(getters: Getters, data: ChartData): SunburstChartRuntime {
    const definition = this.definition;
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
}
