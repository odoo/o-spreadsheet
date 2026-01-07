import {
  copyChartDataSourceInSheetId,
  duplicateDataSourceInDuplicatedSheet,
} from "../helpers/figures/charts/chart_common";
import { ChartDataSource, ChartDataSourceType } from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { RangeAdapter, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

interface ChartDataSourceBuilder<T> {
  // extractData: (definition: T, sheetId: UID, getters: Getters) => D;
  validate(validator: Validator, dataSource: T): CommandResult | CommandResult[];
  transformRanges(chartSheetId: UID, dataSource: T, applyRange: RangeAdapter): T;
  duplicateInDuplicatedSheet(
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID,
    dataSource: T
  ): T;
  copyInSheetId(getters: CoreGetters, sheetIdFrom: UID, sheetIdTo: UID, dataSource: T): T;
  allowedKeys: readonly string[];
}

interface ChartDataSourceRegistry extends Registry<ChartDataSourceBuilder<ChartDataSource>> {
  add<T extends ChartDataSourceType>(
    type: T,
    builder: ChartDataSourceBuilder<Extract<ChartDataSource, { type: NoInfer<T> }>>
  ): this;
}

export const chartDataSourceRegistry: ChartDataSourceRegistry = new Registry();

chartDataSourceRegistry.add("range", {
  validate: (validator, dataSource) => CommandResult.Success,
  transformRanges: (chartSheetId, dataSource, applyRange) => dataSource,
  duplicateInDuplicatedSheet: duplicateDataSourceInDuplicatedSheet,
  copyInSheetId: copyChartDataSourceInSheetId,
  allowedKeys: ["type", "dataSets", "dataSetsHaveTitle", "labelRange"],
});
