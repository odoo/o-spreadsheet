import type * as ChartJS from "chart.js";
import {
  ChartCreationContext,
  ChartData,
  ChartDataSource,
  ChartDataSourceType,
  ChartType,
  DataSetStyle,
  ExcelChartDefinition,
} from "../types/chart/chart";
import { CommandResult } from "../types/commands";
import { ChartCoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

export interface ChartDataSourceBuilder<TExternal, TInternal> {
  supportedChartTypes: readonly ChartType[];
  fromExternalDefinition: (
    dataSource: TExternal,
    defaultSheetId: UID,
    getters: ChartCoreGetters
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
    getters: ChartCoreGetters
  ): TInternal;
  getDefinition(dataSource: TInternal, defaultSheetId: UID, getters: ChartCoreGetters): TExternal;
  getContextCreation(dataSource: TExternal): ChartCreationContext;
  getHierarchicalContextCreation(dataSource: TExternal): ChartCreationContext;
  toExcelDataSets(
    dataSource: TInternal,
    dataSetStyles: DataSetStyle,
    getters: ChartCoreGetters
  ): Pick<ExcelChartDefinition, "dataSets" | "labelRange"> | undefined;
  onDataSetClick?: (
    chartType: ChartType,
    chartId: UID,
    event: ChartJS.ChartEvent,
    items: ChartJS.ActiveElement[],
    chartJsChart: ChartJS.Chart,
    getters: Getters
  ) => void;
  onDataSetHover?: (
    chartType: ChartType,
    chartId: UID,
    event: ChartJS.ChartEvent,
    items: ChartJS.ActiveElement[],
    chartJsChart: ChartJS.Chart
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
