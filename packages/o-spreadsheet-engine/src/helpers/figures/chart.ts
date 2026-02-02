import { RangeAdapterFunctions, UID, Validator } from "../..";
import {
  ChartDataSourceHandler,
  chartDataSourceRegistry,
} from "../../registries/chart_data_source_registry";
import { chartRegistry } from "../../registries/chart_registry";
import { ChartCreationContext, ChartDefinition } from "../../types/chart";
import { CoreGetters } from "../../types/core_getters";
import { Getters } from "../../types/getters";
import { Range } from "../../types/range";
import { AbstractChart } from "./charts/abstract_chart";

export class MyChart {
  private constructor(
    private readonly getters: CoreGetters,
    readonly sheetId: UID,
    private readonly chartTypeHandler: AbstractChart, // e.g., BarChart
    private readonly dataSourceHandler: ChartDataSourceHandler // from registry
  ) {}

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartDefinition<string>
  ) {
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const { ChartTypeHandler, postProcess } = chartRegistry.get(definition.type);
    definition = postProcess?.(getters, sheetId, definition) ?? definition;
    const chartTypeHandler = new ChartTypeHandler(definition, sheetId, getters);
    const dataSourceHandler = DataSourceHandler.fromRangeStr(
      getters,
      sheetId,
      definition.dataSource ?? { type: "never" }
    );
    return new MyChart(getters, sheetId, chartTypeHandler, dataSourceHandler);
  }

  static fromDefinition(getters: CoreGetters, sheetId: UID, definition: ChartDefinition<Range>) {
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const ChartTypeHandler = chartRegistry.get(definition.type).ChartTypeHandler;
    const chartTypeHandler = new ChartTypeHandler(definition, sheetId, getters);
    const dataSourceHandler = DataSourceHandler.fromRanges(
      definition.dataSource ?? { type: "never" }
    );
    return new MyChart(getters, sheetId, chartTypeHandler, dataSourceHandler);
  }

  static validate(validator: Validator, definition: ChartDefinition<string>) {
    const ChartTypeHandler = chartRegistry.get(definition.type).ChartTypeHandler;
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    return validator.batchValidations(
      () => ChartTypeHandler.validateChartDefinition(validator, definition),
      () => DataSourceHandler.validate(validator, definition.dataSource ?? { type: "never" })
    )(undefined); // Typescript requires a parameter but we don't use it (`definition` is captured by closure)
  }

  getRangeDefinition(): ChartDefinition<Range> {
    return {
      ...this.chartTypeHandler.getRangeDefinition(),
      dataSource: this.dataSourceHandler.dataSource,
    } as ChartDefinition<Range>;
  }

  getDefinition(): ChartDefinition<string> {
    return {
      ...this.chartTypeHandler.getDefinition(),
      dataSource: this.dataSourceHandler.getDefinition(this.getters, this.sheetId),
    } as ChartDefinition<string>;
  }

  updateRanges(rangeAdapters: RangeAdapterFunctions): ChartDefinition<Range> {
    return {
      ...this.chartTypeHandler.updateRanges(rangeAdapters).getRangeDefinition(),
      dataSource: this.dataSourceHandler.adaptRanges(rangeAdapters),
    } as ChartDefinition<Range>;
  }

  duplicateInDuplicatedSheet(sheetIdFrom: UID, sheetIdTo: UID): ChartDefinition<string> {
    const newDataSource = this.dataSourceHandler.duplicateInDuplicatedSheet(
      this.getters,
      sheetIdFrom,
      sheetIdTo
    );
    const newChartTypeDef = this.chartTypeHandler.duplicateInDuplicatedSheet(sheetIdTo);
    const definition = {
      ...newChartTypeDef,
      dataSource: newDataSource,
    } as ChartDefinition<Range>;
    return MyChart.fromDefinition(this.getters, sheetIdTo, definition).getDefinition();
  }

  copyInSheetId(sheetId: UID): ChartDefinition<Range> {
    // TODO copyInSheetId should return a definition.
    const newChartTypeDef = this.chartTypeHandler.copyInSheetId(sheetId).getRangeDefinition();
    return {
      ...newChartTypeDef,
      dataSource: this.dataSourceHandler.dataSource,
    } as ChartDefinition<Range>;
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...this.dataSourceHandler.getContextCreation(definition.dataSource ?? { type: "never" }),
      ...this.chartTypeHandler.getContextCreation(this.dataSourceHandler, definition),
    };
  }

  getDefinitionForExcel(getters: Getters) {
    const definition = this.getRangeDefinition();
    if (!("dataSetStyles" in definition)) {
      return undefined;
    }
    return this.chartTypeHandler.getDefinitionForExcel(
      getters,
      this.dataSourceHandler.toExcelDataSets(getters, definition.dataSetStyles)
    );
  }

  getRuntime(getters: Getters) {
    return this.chartTypeHandler.getRuntime(getters, this.dataSourceHandler);
  }
}
