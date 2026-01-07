import {
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  updateChartRangesWithDataSets,
} from "../helpers/figures/charts/chart_common";
import { createValidRange } from "../helpers/range";
import { ChartDataSource, ChartDataSourceType } from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

interface ChartDataSourceBuilder<T> {
  // extractData: (definition: T, sheetId: UID, getters: Getters) => D;
  validate(validator: Validator, dataSource: T): CommandResult | CommandResult[];
  adaptRanges(rangeAdapters: RangeAdapterFunctions, chartSheetId: UID, dataSource: T): T;
  duplicateInDuplicatedSheet(
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID,
    dataSource: T
  ): T;
  copyInSheetId(getters: CoreGetters, sheetIdFrom: UID, sheetIdTo: UID, dataSource: T): T;
  postProcess<T2 extends T>(getters: CoreGetters, sheetId: UID, dataSource: T2): T2;
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
  adaptRanges: updateChartRangesWithDataSets,
  duplicateInDuplicatedSheet: duplicateDataSourceInDuplicatedSheet,
  copyInSheetId: copyChartDataSourceInSheetId,
  postProcess: (getters, sheetId, dataSource) => {
    const labelRange = createValidRange(getters, sheetId, dataSource.labelRange);
    const dataSets = createDataSets(getters, sheetId, dataSource);
    return {
      ...dataSource,
      dataSets: dataSets.map((ds) => {
        return {
          dataSetId: ds.dataSetId,
          dataRange: getters.getRangeString(ds.dataRange, sheetId),
        };
      }),
      labelRange: labelRange && getters.getRangeString(labelRange, sheetId),
    };
  },
  allowedKeys: ["type", "dataSets", "dataSetsHaveTitle", "labelRange"],
});
