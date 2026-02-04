import { RangeAdapterFunctions, UID, Validator } from "../..";
import {
  ChartDataSourceHandler,
  chartDataSourceRegistry,
} from "../../registries/chart_data_source_registry";
import { ChartTypeBuilder, chartTypeRegistry } from "../../registries/chart_registry";
import { ChartCreationContext, ChartDefinition, ChartType } from "../../types/chart";
import { CoreGetters } from "../../types/core_getters";
import { Getters } from "../../types/getters";
import { Range } from "../../types/range";

export class MyChart {
  private constructor(
    private readonly getters: CoreGetters,
    readonly sheetId: UID,
    private readonly definition: ChartDefinition<Range>,
    private readonly chartTypeBuilder: ChartTypeBuilder<ChartType>, // e.g., BarChart
    private readonly dataSourceHandler: ChartDataSourceHandler // from registry
  ) {}

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartDefinition<string>
  ) {
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSourceHandler = DataSourceHandler.fromRangeStr(
      getters,
      sheetId,
      definition.dataSource ?? { type: "never" }
    );
    return new MyChart(
      getters,
      sheetId,
      {
        ...chartTypeBuilder.fromStrDefinition(definition, sheetId, getters),
        dataSource: dataSourceHandler.dataSource,
      } as ChartDefinition<Range>,
      chartTypeBuilder,
      dataSourceHandler
    );
  }

  static fromDefinition(getters: CoreGetters, sheetId: UID, definition: ChartDefinition<Range>) {
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSourceHandler = DataSourceHandler.fromRanges(
      definition.dataSource ?? { type: "never" }
    );
    return new MyChart(getters, sheetId, definition, chartTypeBuilder, dataSourceHandler);
  }

  static validate(validator: Validator, definition: ChartDefinition<string>) {
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    return validator.batchValidations(
      () => chartTypeBuilder.validateDefinition(validator, definition),
      () => DataSourceHandler.validate(validator, definition.dataSource ?? { type: "never" })
    )(undefined); // Typescript requires a parameter but we don't use it (`definition` is captured by closure)
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ChartDefinition<string>,
    rangeAdapters: RangeAdapterFunctions
  ) {
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    if (!definition.dataSource) {
      return chartTypeBuilder.transformDefinition(definition, chartSheetId, rangeAdapters);
    }
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const newDataSource = DataSourceHandler.transform(
      chartSheetId,
      definition.dataSource,
      rangeAdapters
    );
    return {
      ...chartTypeBuilder.transformDefinition(definition, chartSheetId, rangeAdapters),
      dataSource: newDataSource,
    } as ChartDefinition<string>;
  }

  getRangeDefinition(): ChartDefinition<Range> {
    return {
      ...this.definition,
      dataSource: this.dataSourceHandler.dataSource,
    } as ChartDefinition<Range>;
  }

  getDefinition(): ChartDefinition<string> {
    return {
      ...this.chartTypeBuilder.toStrDefinition(this.definition, this.sheetId, this.getters),
      dataSource: this.dataSourceHandler.getDefinition(this.getters, this.sheetId),
    } as ChartDefinition<string>;
  }

  updateRanges(rangeAdapters: RangeAdapterFunctions): ChartDefinition<Range> {
    return {
      ...this.chartTypeBuilder.updateRanges(this.definition, rangeAdapters, this.sheetId),
      dataSource: this.dataSourceHandler.adaptRanges(rangeAdapters),
    } as ChartDefinition<Range>;
  }

  duplicateInDuplicatedSheet(sheetIdFrom: UID, sheetIdTo: UID): ChartDefinition<string> {
    const newDataSource = this.dataSourceHandler.duplicateInDuplicatedSheet(
      this.getters,
      sheetIdFrom,
      sheetIdTo
    );
    const newChartTypeDef = this.chartTypeBuilder.duplicateInDuplicatedSheet(
      this.definition,
      sheetIdFrom,
      sheetIdTo,
      this.getters
    );
    const definition = {
      ...newChartTypeDef,
      dataSource: newDataSource,
    } as ChartDefinition<Range>;
    return MyChart.fromDefinition(this.getters, sheetIdTo, definition).getDefinition();
  }

  copyInSheetId(sheetIdTo: UID): ChartDefinition<Range> {
    const newChartTypeDef = this.chartTypeBuilder.copyInSheetId(
      this.definition,
      this.sheetId,
      sheetIdTo,
      this.getters
    );
    return {
      ...newChartTypeDef,
      dataSource: this.dataSourceHandler.dataSource,
    } as ChartDefinition<Range>;
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    const dataSourceDefinition = this.dataSourceHandler.getDefinition(this.getters, this.sheetId);
    return {
      ...this.dataSourceHandler.getContextCreation(definition.dataSource ?? { type: "never" }),
      ...this.chartTypeBuilder.getContextCreation(
        definition,
        this.dataSourceHandler,
        dataSourceDefinition
      ),
    };
  }

  getDefinitionForExcel(getters: Getters) {
    const definition = this.definition;
    if (!("dataSetStyles" in definition)) {
      return undefined;
    }
    return this.chartTypeBuilder.getDefinitionForExcel(
      getters,
      definition,
      this.dataSourceHandler.toExcelDataSets(getters, definition.dataSetStyles)
    );
  }

  getRuntime(getters: Getters) {
    return this.chartTypeBuilder.getRuntime(
      getters,
      this.definition,
      this.dataSourceHandler,
      this.sheetId
    );
  }
}
