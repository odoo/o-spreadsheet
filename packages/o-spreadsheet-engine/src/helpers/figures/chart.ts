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
  ChartDefinition,
  ChartType,
} from "../../types/chart";
import { CoreGetters } from "../../types/core_getters";
import { Getters } from "../../types/getters";
import { Range } from "../../types/range";

export class Chart {
  private readonly dataSource: ChartDataSource<Range> | undefined;

  private constructor(
    private readonly getters: CoreGetters,
    readonly sheetId: UID,
    private readonly definition: ChartDefinition<Range>,
    private readonly chartTypeBuilder: ChartTypeBuilder<ChartType>, // e.g., BarChart, LineChart
    private readonly dataSourceBuilder: ChartDataSourceBuilder<unknown, unknown> // data comes from ranges, or a database
  ) {
    this.dataSource = definition.dataSource;
  }

  static fromStrDefinition(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartDefinition<string>
  ) {
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSource = dataSourceBuilder.fromExternalDefinition(
      definition.dataSource ?? { type: "none" },
      sheetId,
      getters
    );
    const rangeDefinition = {
      ...chartTypeBuilder.fromStrDefinition(definition, sheetId, getters),
      dataSource,
    } as ChartDefinition<Range>;
    return new Chart(
      getters,
      sheetId,
      Chart.deleteInvalidKeys(rangeDefinition),
      chartTypeBuilder,
      dataSourceBuilder
    );
  }

  static fromDefinition(getters: CoreGetters, sheetId: UID, definition: ChartDefinition<Range>) {
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    return new Chart(getters, sheetId, definition, chartTypeBuilder, dataSourceBuilder);
  }

  static validate(validator: Validator, definition: ChartDefinition<string>) {
    const chartTypeBuilder = chartTypeRegistry.get(definition.type);
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
    return validator.batchValidations(
      () => chartTypeBuilder.validateDefinition(validator, definition),
      () => dataSourceBuilder.validate(definition.dataSource ?? { type: "none" }, validator)
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
    const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource?.type ?? "none");
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

  getSupportedChartTypes(): Set<ChartType> {
    return new Set(this.dataSourceBuilder.supportedChartTypes);
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
    return Chart.fromDefinition(this.getters, sheetIdTo, definition).getDefinition();
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
    return {
      ...this.dataSourceBuilder.getContextCreation(definition.dataSource ?? { type: "none" }),
      ...this.chartTypeBuilder.getContextCreation(
        definition,
        this.dataSourceBuilder,
        definition.dataSource
      ),
    };
  }

  getDefinitionForExcel(getters: Getters) {
    const definition = this.definition;
    return this.chartTypeBuilder.getDefinitionForExcel(
      getters,
      definition,
      this.dataSource
        ? this.dataSourceBuilder.toExcelDataSets(
            this.dataSource,
            "dataSetStyles" in definition ? definition.dataSetStyles : {},
            getters
          )
        : { dataSets: [] }
    );
  }

  getData(getters: Getters, chartId: UID): ChartData {
    const dataSource = this.dataSource;
    return dataSource
      ? this.dataSourceBuilder.extractData(dataSource, chartId, getters)
      : { dataSetsValues: [], labelValues: [] };
  }

  getRuntime(getters: Getters, chartId: UID) {
    const dataSource = this.dataSource;
    const dataExtractors = dataSource
      ? {
          extractData: () => this.dataSourceBuilder.extractData(dataSource, chartId, getters),
          extractHierarchicalData: () =>
            this.dataSourceBuilder.extractHierarchicalData(dataSource, chartId, getters),
        }
      : {
          extractData: () => ({ dataSetsValues: [], labelValues: [] }),
          extractHierarchicalData: () => ({ dataSetsValues: [], labelValues: [] }),
        };
    const eventHandlers = {
      onClick: (event, items, chartJsChart) => {
        return this.dataSourceBuilder.onDataSetClick?.(
          this.definition.type,
          chartId,
          event,
          items,
          chartJsChart,
          getters
        );
      },
    };
    return this.chartTypeBuilder.getRuntime(
      getters,
      this.definition,
      dataExtractors,
      this.sheetId,
      eventHandlers
    );
  }

  static deleteInvalidKeys(definition: ChartDefinition<any>) {
    definition = { ...definition };
    const keys = new Set(chartTypeRegistry.get(definition.type).allowedDefinitionKeys);
    for (const key of Object.keys(definition)) {
      if (!keys.has(key)) {
        delete definition[key];
      }
    }
    return definition;
  }
}
