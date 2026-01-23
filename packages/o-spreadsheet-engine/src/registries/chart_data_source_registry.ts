import { ChartCreationContext, ChartDataSource, ChartDataSourceType } from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Range } from "../types/range";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

interface ChartDataSourceHandlerContructor {
  new (dataSource: ChartDataSource): ChartDataSourceHandler;
  fromRangeStr: (
    getters: CoreGetters,
    defaultSheetId: UID,
    dataSource: ChartDataSource<string>
  ) => ChartDataSourceHandler;
  // fromContextCreation: (context: ChartCreationContext) => ChartDataSourceHandler;
}

export interface ChartDataSourceHandler {
  dataSource: ChartDataSource<Range>;
  // extractData: (definition: T, sheetId: UID, getters: Getters) => D;
  validate(validator: Validator): CommandResult | CommandResult[];
  adaptRanges(rangeAdapters: RangeAdapterFunctions): ChartDataSource;
  duplicateInDuplicatedSheet(
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID
  ): ChartDataSource<Range>;
  getStrDefinition(getters: CoreGetters, defaultSheetId: UID): ChartDataSource<string>;
  getContextCreation(dataSource: ChartDataSource<string>): ChartCreationContext;
}

interface ChartDataSourceRegistry extends Registry<ChartDataSourceHandlerContructor> {
  add<T extends ChartDataSourceType>(type: T, builder: ChartDataSourceHandlerContructor): this;
}

export const chartDataSourceRegistry: ChartDataSourceRegistry = new Registry();
