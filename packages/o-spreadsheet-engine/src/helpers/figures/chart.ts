import { RangeAdapterFunctions, UID, Validator } from "../..";
import {
  ChartDataSourceHandler,
  chartDataSourceRegistry,
} from "../../registries/chart_data_source_registry";
import { ChartBuilder, chartRegistry } from "../../registries/chart_registry";
import { ChartCreationContext, ChartDefinition, ChartType } from "../../types/chart";
import { CoreGetters } from "../../types/core_getters";
import { Getters } from "../../types/getters";
import { Range } from "../../types/range";

export class MyChart {
  private constructor(
    private readonly getters: CoreGetters,
    readonly sheetId: UID,
    private readonly definition: ChartDefinition<Range>,
    private readonly chartTypeHandler: ChartBuilder<ChartType>, // e.g., BarChart
    private readonly dataSourceHandler: ChartDataSourceHandler // from registry
  ) {}

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartDefinition<string>
  ) {
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const ChartTypeHandler = chartRegistry.get(definition.type);
    definition = ChartTypeHandler.postProcess(getters, sheetId, definition) ?? definition;
    const dataSourceHandler = DataSourceHandler.fromRangeStr(
      getters,
      sheetId,
      definition.dataSource ?? { type: "never" }
    );
    // TODO remove cast
    return new MyChart(
      getters,
      sheetId,
      definition as ChartDefinition<Range>,
      ChartTypeHandler,
      dataSourceHandler
    );
  }

  static fromDefinition(getters: CoreGetters, sheetId: UID, definition: ChartDefinition<Range>) {
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const ChartTypeHandler = chartRegistry.get(definition.type);
    const dataSourceHandler = DataSourceHandler.fromRanges(
      definition.dataSource ?? { type: "never" }
    );
    return new MyChart(getters, sheetId, definition, ChartTypeHandler, dataSourceHandler);
  }

  static validate(validator: Validator, definition: ChartDefinition<string>) {
    const ChartTypeHandler = chartRegistry.get(definition.type);
    const DataSourceHandler = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    return validator.batchValidations(
      () => ChartTypeHandler.validateChartDefinition(validator, definition),
      () => DataSourceHandler.validate(validator, definition.dataSource ?? { type: "never" })
    )(undefined); // Typescript requires a parameter but we don't use it (`definition` is captured by closure)
  }

  getRangeDefinition(): ChartDefinition<Range> {
    return {
      ...this.definition,
      dataSource: this.dataSourceHandler.dataSource,
    } as ChartDefinition<Range>;
  }

  getDefinition(): ChartDefinition<string> {
    return {
      ...this.definition,
      dataSource: this.dataSourceHandler.getDefinition(this.getters, this.sheetId),
    } as ChartDefinition<string>;
  }

  updateRanges(rangeAdapters: RangeAdapterFunctions): ChartDefinition<Range> {
    return {
      ...this.chartTypeHandler.updateRanges(this.definition, rangeAdapters),
      dataSource: this.dataSourceHandler.adaptRanges(rangeAdapters),
    } as ChartDefinition<Range>;
  }

  duplicateInDuplicatedSheet(sheetIdFrom: UID, sheetIdTo: UID): ChartDefinition<string> {
    const newDataSource = this.dataSourceHandler.duplicateInDuplicatedSheet(
      this.getters,
      sheetIdFrom,
      sheetIdTo
    );
    const newChartTypeDef = this.chartTypeHandler.duplicateInDuplicatedSheet(
      this.definition,
      sheetIdTo
    );
    const definition = {
      ...newChartTypeDef,
      dataSource: newDataSource,
    } as ChartDefinition<Range>;
    return MyChart.fromDefinition(this.getters, sheetIdTo, definition).getDefinition();
  }

  copyInSheetId(sheetId: UID): ChartDefinition<Range> {
    const newChartTypeDef = this.chartTypeHandler.copyInSheetId(this.definition, sheetId);
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
    const definition = this.definition;
    if (!("dataSetStyles" in definition)) {
      return undefined;
    }
    return this.chartTypeHandler.getDefinitionForExcel(
      getters,
      definition,
      this.dataSourceHandler.toExcelDataSets(getters, definition.dataSetStyles)
    );
  }

  getRuntime(getters: Getters) {
    return this.chartTypeHandler.getRuntime(getters, this.definition, this.dataSourceHandler);
  }
}
