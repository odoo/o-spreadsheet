import {
  ChartCreationContext,
  ChartData,
  ChartDataSource,
  ChartDataSourceType,
  DataSetStyle,
  ExcelChartDefinition,
} from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Range } from "../types/range";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

interface ChartDataSourceHandlerContructor {
  fromRangeStr: (
    getters: CoreGetters,
    defaultSheetId: UID,
    dataSource: ChartDataSource<string>
  ) => ChartDataSourceHandler;
  fromRanges: (dataSource: ChartDataSource<Range>) => ChartDataSourceHandler;
  validate: (
    validator: Validator,
    dataSource: ChartDataSource<string>
  ) => CommandResult | CommandResult[];
  transform(
    sheetId: UID,
    dataSource: ChartDataSource<string>,
    rangeAdapters: RangeAdapterFunctions
  ): ChartDataSource<string>;
  // fromContextCreation: (
  //   context: ChartCreationContext
  // ) => ChartDataSource<string>;
}

export interface ChartDataSourceHandler {
  dataSource: ChartDataSource<Range>;
  extractData(getters: Getters): ChartData;
  extractHierarchicalData(getters: Getters): ChartData;
  adaptRanges(rangeAdapters: RangeAdapterFunctions): ChartDataSource;
  duplicateInDuplicatedSheet(
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID
  ): ChartDataSource<Range>;
  getDefinition(getters: CoreGetters, defaultSheetId: UID): ChartDataSource<string>;
  getContextCreation(dataSource: ChartDataSource<string>): ChartCreationContext;
  getHierarchicalContextCreation(dataSource: ChartDataSource<string>): ChartCreationContext;
  toExcelDataSets(
    getters: CoreGetters,
    dataSetStyles: DataSetStyle
  ): Pick<ExcelChartDefinition, "dataSets" | "labelRange">;
}

interface ChartDataSourceRegistry extends Registry<ChartDataSourceHandlerContructor> {
  add<T extends ChartDataSourceType>(type: T, builder: ChartDataSourceHandlerContructor): this;
}

export const chartDataSourceRegistry: ChartDataSourceRegistry = new Registry();
