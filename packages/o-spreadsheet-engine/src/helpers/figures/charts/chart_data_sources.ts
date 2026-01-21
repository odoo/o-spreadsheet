import { chartDataSourceRegistry } from "../../../registries/chart_data_source_registry";
import { createValidRange } from "../../range";
import {
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  updateChartRangesWithDataSets,
} from "./chart_common";

chartDataSourceRegistry.add("range", {
  validate: (validator, dataSource) =>
    validator.checkValidations(dataSource, checkDataset, checkLabelRange),
  adaptRanges: updateChartRangesWithDataSets,
  duplicateInDuplicatedSheet: duplicateDataSourceInDuplicatedSheet,
  copyInSheetId: copyChartDataSourceInSheetId,
  getContextCreation: (dataSource) => {
    return { auxiliaryRange: dataSource.labelRange };
  },
  fromContextCreation(context) {
    return {
      type: "range",
      dataSets: [],
      dataSetsHaveTitle: false,
      labelRange: context.auxiliaryRange,
      ...context.dataSource,
    };
  },
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
