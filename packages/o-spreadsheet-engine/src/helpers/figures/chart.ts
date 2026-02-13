import { RangeAdapterFunctions, UID, Validator } from "../..";
import {
  ChartDataSourceBuilder,
  chartDataSourceRegistry,
} from "../../registries/chart_data_source_registry";
import { ChartTypeBuilder, chartTypeRegistry } from "../../registries/chart_registry";
import {
  ChartCreationContext,
  ChartData,
  ChartDataSource,
  ChartDataSourceType,
  ChartDefinition,
  ChartType,
} from "../../types/chart";
import { CoreGetters } from "../../types/core_getters";
import { Getters } from "../../types/getters";
import { Range } from "../../types/range";

export class MyChart {
  private constructor(
    private readonly getters: CoreGetters,
    readonly sheetId: UID,
    private readonly definition: ChartDefinition<Range>,
    private readonly dataSource: ChartDataSource<Range> | undefined,
    private readonly chartTypeBuilder: ChartTypeBuilder<ChartType>, // e.g., BarChart
    private readonly dataSourceBuilder: ChartDataSourceBuilder<ChartDataSourceType> // from registry
  ) {}

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartDefinition<string>
  ) {
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSource = dataSourceBuilder.fromRangeStr(
      definition.dataSource ?? { type: "never" },
      sheetId,
      getters
    );
    return new MyChart(
      getters,
      sheetId,
      {
        ...chartTypeBuilder.fromStrDefinition(definition, sheetId, getters),
        dataSource,
      } as ChartDefinition<Range>,
      dataSource,
      chartTypeBuilder,
      dataSourceBuilder
    );
  }

  static fromDefinition(getters: CoreGetters, sheetId: UID, definition: ChartDefinition<Range>) {
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    return new MyChart(
      getters,
      sheetId,
      definition,
      definition.dataSource,
      chartTypeBuilder,
      dataSourceBuilder
    );
  }

  static validate(validator: Validator, definition: ChartDefinition<string>) {
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    return validator.batchValidations(
      () => chartTypeBuilder.validateDefinition(validator, definition),
      () => dataSourceBuilder.validate(definition.dataSource ?? { type: "never" }, validator)
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
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "never");
    const newDataSource = dataSourceBuilder.transform(
      definition.dataSource,
      chartSheetId,
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
      dataSource: this.dataSource,
    } as ChartDefinition<Range>;
  }

  getDefinition(): ChartDefinition<string> {
    return {
      ...this.chartTypeBuilder.toStrDefinition(this.definition, this.sheetId, this.getters),
      dataSource:
        this.dataSource &&
        this.dataSourceBuilder.getDefinition(this.dataSource, this.sheetId, this.getters),
    } as ChartDefinition<string>;
  }

  updateRanges(rangeAdapters: RangeAdapterFunctions): ChartDefinition<Range> {
    return {
      ...this.chartTypeBuilder.updateRanges(this.definition, rangeAdapters, this.sheetId),
      dataSource:
        this.dataSource && this.dataSourceBuilder.adaptRanges(this.dataSource, rangeAdapters),
    } as ChartDefinition<Range>;
  }

  duplicateInDuplicatedSheet(sheetIdFrom: UID, sheetIdTo: UID): ChartDefinition<string> {
    const newDataSource =
      this.dataSource &&
      this.dataSourceBuilder.duplicateInDuplicatedSheet(
        this.dataSource,
        sheetIdFrom,
        sheetIdTo,
        this.getters
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
      dataSource: this.dataSource,
    } as ChartDefinition<Range>;
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    const dataSourceDefinition =
      this.dataSource &&
      this.dataSourceBuilder.getDefinition(this.dataSource, this.sheetId, this.getters);
    return {
      ...this.dataSourceBuilder.getContextCreation(definition.dataSource ?? { type: "never" }),
      ...this.chartTypeBuilder.getContextCreation(
        definition,
        this.dataSourceBuilder,
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
      this.dataSource
        ? this.dataSourceBuilder.toExcelDataSets(this.dataSource, definition.dataSetStyles, getters)
        : { dataSets: [] }
    );
  }

  getData(getters: Getters): ChartData {
    const dataSource = this.dataSource;
    return dataSource
      ? this.dataSourceBuilder.extractData(dataSource, getters)
      : { dataSetsValues: [], labelValues: [] };
  }

  getRuntime(getters: Getters) {
    const dataSource = this.dataSource;
    const dataExtractors = dataSource
      ? {
          extractData: () => this.dataSourceBuilder.extractData(dataSource, getters),
          extractHierarchicalData: () =>
            this.dataSourceBuilder.extractHierarchicalData(dataSource, getters),
        }
      : {
          extractData: () => ({ dataSetsValues: [], labelValues: [] }),
          extractHierarchicalData: () => ({ dataSetsValues: [], labelValues: [] }),
        };
    return this.chartTypeBuilder.getRuntime(getters, this.definition, dataExtractors, this.sheetId);
  }
}
