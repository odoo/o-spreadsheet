import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
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
import { CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
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
    "dataSetsHaveTitle",
    "labelRange",
    "colorScale",
    "missingValueColor",
    "region",
  ] as const;

  constructor(private definition: GeoChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
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
      dataSource: context.dataSource ?? { dataSets: [] },
      dataSetStyles: context.dataSetStyles ?? {},
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      labelRange: context.auxiliaryRange || undefined,
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.labelRange,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): GeoChart {
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
    return new GeoChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GeoChart {
    const dataSource = {
      dataSets: this.definition.dataSource.dataSets.map((dataSet) => {
        const range = this.getters.getRangeFromSheetXC(this.sheetId, dataSet.dataRange);
        return {
          ...dataSet,
          dataRange: this.getters.getRangeString(range, sheetId),
        };
      }),
    };
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, this.labelRange, sheetId);
    return new GeoChart(definition, sheetId, this.getters);
  }

  getDefinition(): GeoChartDefinition {
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

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource,
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): GeoChartDefinition {
    return {
      ...this.definition,
      dataSource,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): GeoChart {
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
