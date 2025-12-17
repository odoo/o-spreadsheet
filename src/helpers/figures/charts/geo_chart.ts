import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  GeoChartDefinition,
  GeoChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { ChartConfiguration } from "chart.js";
import { ApplyRangeChange, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getChartTitle,
  getGeoChartData,
  getGeoChartDatasets,
  getGeoChartScales,
  getGeoChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class GeoChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "geo";

  static allowedDefinitionKeys: readonly (keyof GeoChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "colorScale",
    "missingValueColor",
    "region",
  ] as const;

  constructor(private definition: GeoChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: GeoChartDefinition,
    applyChange: RangeAdapter
  ): GeoChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: GeoChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): GeoChartDefinition {
    return {
      background: context.background,
      dataSource: context.dataSource ?? {
        dataSets: [],
        dataSetsHaveTitle: false,
        labelRange: context.auxiliaryRange,
      },
      dataSetStyles: context.dataSetStyles ?? {},
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.dataSource.labelRange,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): GeoChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new GeoChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GeoChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new GeoChart(definition, sheetId, this.getters);
  }

  getDefinition(): GeoChartDefinition {
    return this.getDefinitionWithSpecificDataSets({
      ...this.definition.dataSource,
      dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
        dataSetId,
        dataRange: this.getters.getRangeString(dataRange, this.sheetId),
      })),
      labelRange: this.labelRange && this.getters.getRangeString(this.labelRange, this.sheetId),
    });
  }

  private getDefinitionWithSpecificDataSets(dataSource: ChartRangeDataSource): GeoChartDefinition {
    return {
      ...this.definition,
      dataSource,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): GeoChart {
    const { dataSource, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.definition.dataSource
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new GeoChart(definition, this.sheetId, this.getters);
  }
}

export function createGeoChartRuntime(
  getters: Getters,
  chart: GeoChart,
  data: ChartData
): GeoChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getGeoChartData(definition, data, getters);

  const config: ChartConfiguration = {
    type: "choropleth",
    data: {
      datasets: getGeoChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getGeoChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        tooltip: getGeoChartTooltip(definition, chartData),
        legend: { display: false },
      },
    },
  };

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
