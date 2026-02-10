import { ChartTerms } from "../../../components/translations_terms";
import {
  ChartDataSourceBuilder,
  chartDataSourceRegistry,
} from "../../../registries/chart_data_source_registry";
import {
  ChartData,
  ChartRangeDataSource,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  LabelValues,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { CellErrorType } from "../../../types/errors";
import { Getters } from "../../../types/getters";
import { FunctionResultObject } from "../../../types/misc";
import { Range } from "../../../types/range";
import { isErrorCell, isNumberCell, isTextCell } from "../../cells/cell_evaluation";
import { isDefined, range } from "../../misc";
import { createValidRange, duplicateRangeInDuplicatedSheet } from "../../range";
import { recomputeZones } from "../../recompute_zones";
import { getZoneArea } from "../../zones";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateLabelRangeInDuplicatedSheet,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
} from "./chart_common";

const EMPTY = Object.freeze({ value: null });
const ONE = Object.freeze({ value: 1 });

export const ChartRangeDataSourceHandler: ChartDataSourceBuilder<"range"> = {
  fromRangeStr(dataSource, defaultSheetId, getters) {
    const dataSets = createDataSets(getters, defaultSheetId, dataSource);
    const labelRange = createValidRange(getters, defaultSheetId, dataSource.labelRange);
    return { ...dataSource, dataSets, labelRange };
  },

  validate: (dataSource, validator) =>
    validator.checkValidations(dataSource, checkDataset, checkLabelRange),

  transform(dataSource, defaultSheetId, { adaptRangeString }) {
    let labelRange: string | undefined;
    if (dataSource.labelRange) {
      const { changeType, range: adaptedRange } = adaptRangeString(
        defaultSheetId,
        dataSource.labelRange
      );
      if (changeType !== "REMOVE") {
        labelRange = adaptedRange;
      }
    }

    const dataSets: ChartRangeDataSource<string>["dataSets"] = [];
    for (const dataSet of dataSource.dataSets) {
      const newDataSet = { ...dataSet };
      const { changeType, range: adaptedRange } = adaptRangeString(
        defaultSheetId,
        dataSet.dataRange
      );

      if (changeType !== "REMOVE") {
        newDataSet.dataRange = adaptedRange;
        dataSets.push(newDataSet);
      }
    }
    return {
      ...dataSource,
      dataSets,
      labelRange,
    };
  },

  extractData: (dataSource, getters) => getChartData(getters, dataSource),

  extractHierarchicalData(dataSource, getters) {
    const dataSets = dataSource.dataSets;
    const labelRange = dataSource.labelRange;
    const labelValues = getChartLabelValues(getters, dataSets, labelRange);
    const dataSetsValues = getHierarchicalDatasetValues(getters, dataSets);
    const data = { labelValues, dataSetsValues };
    if (
      shouldRemoveFirstLabel(
        labelValues.length,
        dataSetsValues[0]?.data.length + (dataSetsValues[0]?.label !== undefined ? 1 : 0),
        dataSource.dataSetsHaveTitle || false
      )
    ) {
      labelValues.shift();
    }
    return data;
  },

  adaptRanges(dataSource, { applyChange }) {
    const dataSetsWithUndefined = dataSource.dataSets
      // FIXME: I'm cheating here. ds is not supposed to be a DataSet, but a dataSet from definition
      .map((ds: DataSet) => {
        const { range: adaptedRangeStr, changeType } = applyChange(ds.dataRange);
        if (changeType === "REMOVE") {
          return undefined;
        }
        let labelCell: Range | undefined = undefined;
        if (ds.labelCell) {
          const { range: adaptedLabelCellRange, changeType: labelCellChangeType } = applyChange(
            ds.labelCell
          );
          if (labelCellChangeType !== "REMOVE") {
            labelCell = adaptedLabelCellRange;
          }
        }
        return {
          ...ds,
          dataRange: adaptedRangeStr,
          labelCell,
        };
      })
      .filter(isDefined);
    let labelRange = dataSource.labelRange;
    if (labelRange) {
      const { range: adaptedLabelRange, changeType } = applyChange(labelRange);
      if (changeType === "REMOVE") {
        labelRange = undefined;
      } else {
        labelRange = adaptedLabelRange;
      }
    }
    const dataSets = dataSetsWithUndefined;
    return {
      ...dataSource,
      dataSets,
      labelRange: labelRange?.invalidSheetName || labelRange?.invalidXc ? undefined : labelRange,
    };
  },

  getDefinition(dataSource, defaultSheetId, getters) {
    return {
      labelRange: dataSource.labelRange
        ? getters.getRangeString(dataSource.labelRange, defaultSheetId)
        : undefined,
      type: "range",
      dataSets: dataSource.dataSets.map((dataSet) => ({
        dataSetId: dataSet.dataSetId,
        dataRange: getters.getRangeString(dataSet.dataRange, defaultSheetId),
      })),
      dataSetsHaveTitle: dataSource.dataSetsHaveTitle,
    };
  },

  /**
   * Duplicate the dataSets. All ranges on sheetIdFrom are adapted to target
   * sheetIdTo.
   */
  duplicateInDuplicatedSheet(dataSource, sheetIdFrom, sheetIdTo, getters) {
    return {
      ...dataSource,
      labelRange: duplicateLabelRangeInDuplicatedSheet(
        sheetIdFrom,
        sheetIdTo,
        dataSource.labelRange
      ),
      dataSets: dataSource.dataSets.map((ds) => ({
        ...ds,
        dataRange: duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, ds.dataRange),
      })),
    };
  },

  getContextCreation: (dataSource) => ({ auxiliaryRange: dataSource.labelRange }),

  getHierarchicalContextCreation(dataSource) {
    const leafRange = dataSource.dataSets.at(-1)?.dataRange;
    const dataSetsHaveTitle = dataSource.dataSetsHaveTitle;
    return {
      auxiliaryRange: leafRange,
      hierarchicalDataSource: dataSource,
      dataSource: dataSource.labelRange
        ? {
            type: "range",
            dataSets: [{ dataRange: dataSource.labelRange, dataSetId: "0" }],
            dataSetsHaveTitle,
          }
        : { type: "range", dataSets: [], dataSetsHaveTitle },
    };
  },

  toExcelDataSets(dataSource, dataSetStyles, getters) {
    const dataSets = dataSource.dataSets;
    const labelRange = dataSource.labelRange;
    const excelDataSets: ExcelChartDataset[] = dataSets
      .map((ds: DataSet) => toExcelDataset(getters, dataSetStyles, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const datasetLength = dataSets[0] ? getZoneArea(dataSets[0].dataRange.zone) : undefined;
    const labelLength = labelRange ? getZoneArea(labelRange.zone) : 0;
    const _shouldRemoveFirstLabel = shouldRemoveFirstLabel(
      labelLength,
      datasetLength,
      dataSource.dataSetsHaveTitle
    );
    const excelLabelRange = toExcelLabelRange(getters, labelRange, _shouldRemoveFirstLabel);
    return {
      dataSets: excelDataSets,
      labelRange: excelLabelRange,
    };
  },
};

export function getChartData(getters: Getters, dataSource: ChartRangeDataSource): ChartData {
  const dataSets = dataSource.dataSets;
  const labelRange = dataSource.labelRange;
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  const dataSetsValues = getChartDatasetValues(getters, dataSets);
  const data = { labelValues, dataSetsValues };
  // FIXME nested ternary
  const numberOfDataPoints = dataSetsValues.length
    ? dataSetsValues[0]?.data.length + (dataSetsValues[0]?.label !== undefined ? 1 : 0)
    : 0;
  if (
    shouldRemoveFirstLabel(
      labelValues.length,
      numberOfDataPoints,
      dataSource.dataSetsHaveTitle || false
    )
  ) {
    labelValues.shift();
  }
  return data;
}

function getChartDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
  const datasetValues: DatasetValues[] = [];
  for (const [dsIndex, ds] of Object.entries(dataSets)) {
    let label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`;
    let hidden = getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left);
    if (ds.labelCell) {
      const { sheetId, zone } = ds.labelCell;
      const cell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });
      if (cell) {
        label = cell.formattedValue;
      }
    }

    let data = ds.dataRange ? getData(getters, ds) : [];
    if (
      data.every((cell) => !cell.value || isTextCell(cell)) &&
      data.filter(isTextCell).length > 1
    ) {
      // Convert categorical data into counts
      data = data.map((cell) => (!isErrorCell(cell) ? ONE : EMPTY));
    } else if (data.every((cell) => !isNumberCell(cell))) {
      hidden = true;
    }
    datasetValues.push({ data, label, hidden, dataSetId: ds.dataSetId });
  }
  return datasetValues;
}

function getChartLabelValues(
  getters: Getters,
  dataSets: DataSet[],
  labelRange?: Range
): LabelValues {
  let labels: LabelValues = [];
  if (labelRange) {
    const { left } = labelRange.zone;
    if (
      !labelRange.invalidXc &&
      !labelRange.invalidSheetName &&
      !getters.isColHidden(labelRange.sheetId, left)
    ) {
      labels = getters.getRangeValues(labelRange);
    } else if (dataSets[0]) {
      const ranges = getData(getters, dataSets[0]);
      labels = range(0, ranges.length).map((r) => ({ value: r.toString() }));
    }
  } else if (dataSets.length === 1) {
    const dataLength = getData(getters, dataSets[0]).length;
    for (let i = 0; i < dataLength; i++) {
      labels.push({ value: "" });
    }
  } else {
    if (dataSets[0]) {
      const ranges = getData(getters, dataSets[0]);
      labels = range(0, ranges.length).map((r) => ({ value: r.toString() }));
    }
  }
  return labels;
}

/**
 * Get the values for a hierarchical dataset. The values can be defined in a tree-like structure
 * in the sheet, and this function will fill up the blanks.
 *
 * @example the following dataset:
 *
 * 2024    Q1    W1    100
 *               W2    200
 *
 * will have the same value as the dataset:
 * 2024    Q1    W1    100
 * 2024    Q1    W2    200
 */
function getHierarchicalDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
  dataSets = dataSets.filter(
    (ds) => !getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left)
  );
  const datasetValues: DatasetValues[] = dataSets.map((ds) => ({
    data: [],
    label: "",
    dataSetId: ds.dataSetId,
  }));
  const dataSetsData = dataSets.map((ds) => getData(getters, ds));
  if (!dataSetsData.length) {
    return datasetValues;
  }
  const minLength = Math.min(...dataSetsData.map((ds) => ds.length));

  let currentValues: FunctionResultObject[] = [];
  const leafDatasetIndex = dataSets.length - 1;

  for (let i = 0; i < minLength; i++) {
    for (let dsIndex = 0; dsIndex < dataSetsData.length; dsIndex++) {
      let cell = dataSetsData[dsIndex][i];
      if ((cell === undefined || cell.value === null) && dsIndex !== leafDatasetIndex) {
        cell = currentValues[dsIndex];
      }
      if (cell?.value !== currentValues[dsIndex]?.value) {
        currentValues = currentValues.slice(0, dsIndex);
        currentValues[dsIndex] = cell;
      }
      datasetValues[dsIndex].data.push(cell ?? EMPTY);
    }
  }

  return datasetValues.filter((ds) => ds.data.some((d) => d.value !== null));
}

/**
 * Get the data from a dataSet
 */
export function getData(getters: Getters, ds: DataSet): FunctionResultObject[] {
  if (ds.dataRange) {
    const labelCellZone = ds.labelCell ? [ds.labelCell.zone] : [];
    const dataZone = recomputeZones([ds.dataRange.zone], labelCellZone)[0];
    if (dataZone === undefined) {
      return [];
    }
    const dataRange = getters.getRangeFromZone(ds.dataRange.sheetId, dataZone);
    return getters.getRangeValues(dataRange).map((cell) => (cell.value === "" ? EMPTY : cell));
  }
  return [];
}

const ChartNeverDataSourceHandler: ChartDataSourceBuilder<"never"> = {
  fromRangeStr: () => ({ type: "never" }),
  validate: () => CommandResult.Success,
  transform: () => ({ type: "never" }),
  extractData: () => ({ dataSetsValues: [], labelValues: [] }),
  extractHierarchicalData: () => ({ dataSetsValues: [], labelValues: [] }),
  adaptRanges: (dataSource) => dataSource,
  getDefinition: (dataSource) => dataSource,
  duplicateInDuplicatedSheet: (dataSource) => dataSource,
  getContextCreation: () => ({}),
  getHierarchicalContextCreation: () => ({}),
  toExcelDataSets: () => ({ dataSets: [], labelRange: "" }),
};

chartDataSourceRegistry.add("range", ChartRangeDataSourceHandler);
chartDataSourceRegistry.add("never", ChartNeverDataSourceHandler);
// allowedKeys: ["type", "dataSets", "dataSetsHaveTitle", "labelRange"],
