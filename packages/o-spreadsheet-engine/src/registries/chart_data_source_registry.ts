import {
  ChartCreationContext,
  ChartData,
  ChartDataSource,
  ChartDataSourceType,
  ChartType,
  DataSetStyle,
  ExcelChartDefinition,
} from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

export interface ChartDataSourceBuilder<TExternal, TInternal> {
  supportedChartTypes: readonly ChartType[];
  fromExternalDefinition: (
    dataSource: TExternal,
    defaultSheetId: UID,
    getters: CoreGetters
  ) => TInternal;
  fromContextCreation: (context: ChartCreationContext) => ChartDataSource<string>;
  fromHierarchicalContextCreation: (context: ChartCreationContext) => ChartDataSource<string>;
  validate: (dataSource: TExternal, validator: Validator) => CommandResult | CommandResult[];
  transform(
    dataSource: TExternal,
    defaultSheetId: UID,
    rangeAdapters: RangeAdapterFunctions
  ): TExternal;
  extractData(dataSource: TInternal, chartId: UID, getters: Getters): ChartData;
  extractHierarchicalData(dataSource: TInternal, chartId: UID, getters: Getters): ChartData;
  adaptRanges(dataSource: TInternal, rangeAdapters: RangeAdapterFunctions): TInternal;
  duplicateInDuplicatedSheet(
    dataSource: TInternal,
    sheetIdFrom: UID,
    sheetIdTo: UID,
    getters: CoreGetters
  ): TInternal;
  getDefinition(dataSource: TInternal, defaultSheetId: UID, getters: CoreGetters): TExternal;
  getContextCreation(dataSource: TExternal): ChartCreationContext;
  getHierarchicalContextCreation(dataSource: TExternal): ChartCreationContext;
  toExcelDataSets(
    dataSource: TInternal,
    dataSetStyles: DataSetStyle,
    getters: CoreGetters
  ): Pick<ExcelChartDefinition, "dataSets" | "labelRange">;
  onDataSetClick?: (
    chartType: ChartType,
    chartId: UID,
    // chartjs internals
    event: unknown,
    items: unknown,
    chartJsChart: unknown,
    getters: Getters
  ) => void;
}

export interface ChartDataSourceRegistry
  extends Registry<ChartDataSourceBuilder<unknown, unknown>> {
  add<T extends ChartDataSourceType>(
    type: T,
    builder: ChartDataSourceBuilder<unknown, unknown>
  ): this;
}

export const chartDataSourceRegistry: ChartDataSourceRegistry = new Registry();
