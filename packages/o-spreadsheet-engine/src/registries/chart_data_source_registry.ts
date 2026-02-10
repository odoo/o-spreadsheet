import {
  ChartCreationContext,
  ChartData,
  ChartDataSource,
  ChartDataSourceType,
  DataSetStyle,
  DataSourceType,
  ExcelChartDefinition,
} from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Range } from "../types/range";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

export interface ChartDataSourceBuilder<T extends ChartDataSourceType> {
  fromRangeStr: (
    getters: CoreGetters,
    defaultSheetId: UID,
    dataSource: DataSourceType<T, string>
  ) => ChartDataSource<Range>;
  // fromRanges: (dataSource: ChartDataSource<Range>) => ChartDataSourceHandler;
  validate: (
    validator: Validator,
    dataSource: DataSourceType<T, string>
  ) => CommandResult | CommandResult[];
  transform(
    sheetId: UID,
    dataSource: DataSourceType<T, string>,
    rangeAdapters: RangeAdapterFunctions
  ): ChartDataSource<string>;
  extractData(dataSource: DataSourceType<T, Range>, getters: Getters): ChartData;
  extractHierarchicalData(dataSource: DataSourceType<T, Range>, getters: Getters): ChartData;
  adaptRanges(
    dataSource: DataSourceType<T, Range>,
    rangeAdapters: RangeAdapterFunctions
  ): ChartDataSource;
  duplicateInDuplicatedSheet(
    dataSource: DataSourceType<T, Range>,
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID
  ): ChartDataSource<Range>;
  getDefinition(
    dataSource: DataSourceType<T, Range>,
    getters: CoreGetters,
    defaultSheetId: UID
  ): ChartDataSource<string>;
  getContextCreation(dataSource: DataSourceType<T, string>): ChartCreationContext;
  getHierarchicalContextCreation(dataSource: DataSourceType<T, string>): ChartCreationContext;
  toExcelDataSets(
    dataSource: DataSourceType<T, Range>,
    getters: CoreGetters,
    dataSetStyles: DataSetStyle
  ): Pick<ExcelChartDefinition, "dataSets" | "labelRange">;
}

interface ChartDataSourceRegistry extends Registry<ChartDataSourceBuilder<any>> {
  add<T extends ChartDataSourceType>(type: T, builder: ChartDataSourceBuilder<T>): this;
}

export const chartDataSourceRegistry: ChartDataSourceRegistry = new Registry();
