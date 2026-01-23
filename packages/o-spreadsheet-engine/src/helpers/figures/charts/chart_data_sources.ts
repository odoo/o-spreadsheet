import { CoreGetters, RangeAdapterFunctions, UID, Validator } from "../../..";
import {
  ChartDataSourceHandler,
  chartDataSourceRegistry,
} from "../../../registries/chart_data_source_registry";
import { ChartCreationContext, ChartDataSource, ChartRangeDataSource } from "../../../types/chart";
import { createValidRange } from "../../range";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  updateChartRangesWithDataSets,
} from "./chart_common";

export class ChartRangeDataSourceHandler implements ChartDataSourceHandler {
  constructor(readonly dataSource: ChartRangeDataSource) {}

  static fromRangeStr(
    getters: CoreGetters,
    defaultSheetId: UID,
    dataSource: ChartRangeDataSource<string>
  ): ChartRangeDataSourceHandler {
    const dataSets = createDataSets(getters, defaultSheetId, dataSource);
    const labelRange = createValidRange(getters, defaultSheetId, dataSource.labelRange);
    return new ChartRangeDataSourceHandler({ ...dataSource, dataSets, labelRange });
  }

  static fromContextCreation(context: ChartCreationContext): ChartRangeDataSource<string> {
    return {
      type: "range",
      dataSets: [],
      dataSetsHaveTitle: false,
      labelRange: context.auxiliaryRange,
      ...context.dataSource,
    };
  }

  validate(validator: Validator) {
    return validator.checkValidations(this.dataSource, checkDataset, checkLabelRange);
  }

  adaptRanges(rangeAdapters: RangeAdapterFunctions) {
    return updateChartRangesWithDataSets(rangeAdapters, this.dataSource);
  }

  getStrDefinition(getters: CoreGetters, defaultSheetId: UID): ChartDataSource<string> {
    return {
      labelRange: this.dataSource.labelRange
        ? getters.getRangeString(this.dataSource.labelRange, defaultSheetId)
        : undefined,
      type: "range",
      dataSets: this.dataSource.dataSets.map((dataSet) => ({
        dataSetId: dataSet.dataSetId,
        dataRange: getters.getRangeString(dataSet.dataRange, defaultSheetId),
      })),
      dataSetsHaveTitle: this.dataSource.dataSetsHaveTitle,
    };
  }

  duplicateInDuplicatedSheet(
    getters: CoreGetters,
    sheetIdFrom: UID,
    sheetIdTo: UID
  ): ChartRangeDataSource {
    return duplicateDataSourceInDuplicatedSheet(getters, sheetIdFrom, sheetIdTo, this.dataSource);
  }

  getContextCreation(dataSource: ChartRangeDataSource<string>): ChartCreationContext {
    return { auxiliaryRange: dataSource.labelRange };
  }
}

chartDataSourceRegistry.add("range", ChartRangeDataSourceHandler);
// allowedKeys: ["type", "dataSets", "dataSetsHaveTitle", "labelRange"],
