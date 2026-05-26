import { ChartTerms } from "../../../components/translations_terms";
import {
  ChartDataSourceBuilder,
  chartDataSourceRegistry,
} from "../../../registries/chart_data_source_registry";
import {
  CHART_TYPES,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  LabelValues,
} from "../../../types/chart/chart";
import { CommandResult } from "../../../types/commands";
import { CellErrorType } from "../../../types/errors";
import { EvaluationGetters } from "../../../types/getters";
import { FunctionResultObject } from "../../../types/misc";
import { Range } from "../../../types/range";
import {
  isBooleanResult,
  isErrorResult,
  isNumberResult,
  isTextResult,
} from "../../cells/cell_evaluation";
import { formatValue } from "../../format/format";
import { isDefined } from "../../misc";
import { createValidRange, duplicateRangeInDuplicatedSheet } from "../../range";
import { recomputeZones } from "../../recompute_zones";
import { getZoneArea, isEqual } from "../../zones";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
} from "./chart_common";

const EMPTY = Object.freeze({ value: null });
const ONE = Object.freeze({ value: 1 });

/**
 * Adapt each label range with `adaptOne`, dropping the ones it returns `undefined` for
 * (e.g. removed or invalid ranges), and collapse an empty result to `undefined`.
 */
function adaptLabelRanges<T, U>(
  labelRanges: T[] | undefined,
  adaptOne: (labelRange: T) => U | undefined
): U[] | undefined {
  if (!labelRanges?.length) {
    return undefined;
  }
  const adaptedLabelRanges = labelRanges.map(adaptOne).filter(isDefined);
  return adaptedLabelRanges.length ? adaptedLabelRanges : undefined;
}

export const ChartRangeDataSourceHandler: ChartDataSourceBuilder<
  ChartRangeDataSource<string>,
  ChartRangeDataSource<Range>
> = {
  supportedChartTypes: CHART_TYPES,
  fromExternalDefinition(dataSource, defaultSheetId, getters) {
    const dataSets = createDataSets(getters, defaultSheetId, dataSource);
    const labelRanges = adaptLabelRanges(dataSource.labelRanges, (lr) =>
      createValidRange(getters, defaultSheetId, lr)
    );
    return {
      ...dataSource,
      dataSets,
      labelRanges,
    };
  },

  fromContextCreation(context) {
    const dsLabelRanges =
      context.dataSource?.type === "range" ? context.dataSource.labelRanges : undefined;
    const primaryRange = context.auxiliaryRange;
    let labelRanges: string[] | undefined;
    if (dsLabelRanges?.length) {
      labelRanges =
        !primaryRange || dsLabelRanges[dsLabelRanges.length - 1] === primaryRange
          ? dsLabelRanges
          : [...dsLabelRanges, primaryRange];
    } else {
      labelRanges = primaryRange ? [primaryRange] : undefined;
    }
    return {
      type: "range",
      dataSets: [],
      dataSetsHaveTitle: false,
      ...context.dataSource,
      labelRanges,
    };
  },

  fromHierarchicalContextCreation(context) {
    if (
      context.dataSource?.type !== "range" ||
      (context.hierarchicalDataSource !== undefined &&
        context.hierarchicalDataSource.type !== "range")
    ) {
      return {
        type: "range",
        dataSets: [],
        dataSetsHaveTitle: false,
      };
    }
    if (context.hierarchicalDataSource?.dataSets.length) {
      return context.hierarchicalDataSource;
    }
    const dsLabelRanges =
      context.dataSource?.type === "range" ? context.dataSource.labelRanges : undefined;
    const dataSetsHaveTitle = context.dataSource?.dataSetsHaveTitle ?? false;
    const firstDataRange = context.dataSource?.dataSets?.[0]?.dataRange;
    const categoryRanges: string[] = dsLabelRanges?.length
      ? dsLabelRanges
      : context.auxiliaryRange
      ? [context.auxiliaryRange]
      : [];
    return {
      type: "range",
      dataSets: categoryRanges.map((range, i) => ({ dataRange: range, dataSetId: String(i) })),
      dataSetsHaveTitle,
      labelRanges: firstDataRange ? [firstDataRange] : undefined,
    };
  },

  validate: (dataSource, validator) =>
    validator.checkValidations(dataSource, checkDataset, checkLabelRange),

  transform(dataSource, defaultSheetId, { adaptRangeString }) {
    const labelRanges = adaptLabelRanges(dataSource.labelRanges, (lr) => {
      const { changeType, range: adaptedRange } = adaptRangeString(defaultSheetId, lr);
      return changeType !== "REMOVE" ? adaptedRange : undefined;
    });

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
      labelRanges,
    };
  },

  extractData: (dataSource, chartId, getters) => getChartData(getters, dataSource),

  extractHierarchicalData(dataSource, chartId, getters) {
    const dataSets = dataSource.dataSets;
    const labelRange = dataSource.labelRanges?.[0];
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
      // FIXME: we are cheating here. `ds` is not supposed to be a DataSet, but a dataSet from definition
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
    const labelRanges = adaptLabelRanges(dataSource.labelRanges, (lr) => {
      const { range: adaptedLabelRange, changeType } = applyChange(lr);
      return changeType !== "REMOVE" &&
        !adaptedLabelRange.invalidSheetName &&
        !adaptedLabelRange.invalidXc
        ? adaptedLabelRange
        : undefined;
    });

    const dataSets = dataSetsWithUndefined;
    return {
      ...dataSource,
      dataSets,
      labelRanges,
    };
  },

  getDefinition(dataSource, defaultSheetId, getters) {
    const labelRanges = dataSource.labelRanges?.map((lr) =>
      getters.getRangeString(lr, defaultSheetId)
    );
    return {
      ...(labelRanges?.length ? { labelRanges } : {}),
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
    const labelRanges = dataSource.labelRanges?.map((lr) =>
      duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, lr)
    );
    return {
      ...dataSource,
      ...(labelRanges?.length ? { labelRanges } : {}),
      dataSets: dataSource.dataSets.map((ds) => ({
        ...ds,
        dataRange: duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, ds.dataRange),
      })),
    };
  },

  getContextCreation: (dataSource) => ({
    auxiliaryRange: dataSource.labelRanges?.at(-1),
    dataSource,
  }),

  getHierarchicalContextCreation(dataSource) {
    const dataSetsHaveTitle = dataSource.dataSetsHaveTitle;
    const categoryColumns = dataSource.dataSets;
    const valueColumn = dataSource.labelRanges?.[0];
    const leafCategory = categoryColumns[categoryColumns.length - 1];
    const remainingCategories = categoryColumns.slice(0, -1);
    return {
      auxiliaryRange: leafCategory?.dataRange || undefined,
      hierarchicalDataSource: dataSource,
      dataSource: {
        type: "range",
        dataSets: valueColumn ? [{ dataRange: valueColumn, dataSetId: "0" }] : [],
        dataSetsHaveTitle,
        ...(remainingCategories.length && {
          labelRanges: remainingCategories.map((c) => c.dataRange),
        }),
      },
    };
  },

  toExcelDataSets(dataSource, dataSetStyles, getters) {
    const dataSets = dataSource.dataSets;
    const labelRange = dataSource.labelRanges?.at(-1);
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
      labelRanges: excelLabelRange ? [excelLabelRange] : undefined,
    };
  },
};

export function getChartData(
  getters: EvaluationGetters,
  dataSource: ChartRangeDataSource
): ChartData {
  const dataSets = dataSource.dataSets;
  const labelRanges = dataSource.labelRanges;
  const primaryLabelRange = labelRanges?.at(-1);
  const labelValues = getChartLabelValues(getters, dataSets, primaryLabelRange);
  const dataSetsValues = getChartDatasetValues(getters, dataSets, primaryLabelRange);
  const data: ChartData = { labelValues, dataSetsValues };
  // FIXME nested ternary
  const numberOfDataPoints = dataSetsValues.length
    ? dataSetsValues[0]?.data.length + (dataSetsValues[0]?.label !== undefined ? 1 : 0)
    : 0;
  const removeFirstLabel = shouldRemoveFirstLabel(
    labelValues.length,
    numberOfDataPoints,
    dataSource.dataSetsHaveTitle || false
  );
  if (removeFirstLabel) {
    labelValues.shift();
  }
  if (dataSource.labelRanges && dataSource.labelRanges.length > 1) {
    const parentLabelRanges = dataSource.labelRanges.slice(0, -1).reverse();
    data.secondaryLabelValues = parentLabelRanges.map((lr) => {
      const values = getChartLabelValues(getters, dataSets, lr);
      if (removeFirstLabel) {
        values.shift();
      }
      return values;
    });
  }
  return data;
}

function getChartDatasetValues(
  getters: EvaluationGetters,
  dataSets: DataSet[],
  labelRange: Range | undefined
): DatasetValues[] {
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
    if (!data.some((cell) => isNumberResult(cell)) && data.some((cell) => isBooleanResult(cell))) {
      // When the labels are the boolean values themselves (categorical chart), each boolean
      // occurrence is counted as 1 so it can be aggregated per TRUE/FALSE label. Otherwise, the
      // booleans are used as regular numeric values: TRUE = 1, FALSE = 0.
      const isCategorical =
        !labelRange ||
        (labelRange.sheetId === ds.dataRange.sheetId &&
          isEqual(labelRange.zone, ds.dataRange.zone));
      data = data.map((cell) => {
        if (!isBooleanResult(cell)) {
          return EMPTY;
        } else if (isCategorical) {
          return ONE;
        } else {
          return { value: cell.value ? 1 : 0 };
        }
      });
    } else if (
      data.every((cell) => !cell.value || isTextResult(cell)) &&
      data.filter(isTextResult).length > 1
    ) {
      // Convert categorical data into counts
      data = data.map((cell) => (cell.value && !isErrorResult(cell) ? ONE : EMPTY));
    } else if (data.every((cell) => !isNumberResult(cell))) {
      hidden = true;
    }
    datasetValues.push({ data, label, hidden, dataSetId: ds.dataSetId });
  }
  return datasetValues;
}

function getChartLabelValues(
  getters: EvaluationGetters,
  dataSets: DataSet[],
  labelRange: Range | undefined
): LabelValues {
  if (labelRange) {
    const { left } = labelRange.zone;
    if (
      !labelRange.invalidXc &&
      !labelRange.invalidSheetName &&
      !getters.isColHidden(labelRange.sheetId, left)
    ) {
      return getters.getVisibleRangeValues(labelRange);
    }
  }
  if (dataSets[0]) {
    const dataLength = getData(getters, dataSets[0]).length;
    return Array.from({ length: dataLength }, () => ({ value: "" }));
  }
  return [];
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
function getHierarchicalDatasetValues(
  getters: EvaluationGetters,
  dataSets: DataSet[]
): DatasetValues[] {
  dataSets = dataSets.filter(
    (ds) => !getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left)
  );
  const datasetValues: DatasetValues[] = dataSets.map((ds) => ({
    data: [],
    label: "",
    dataSetId: ds.dataSetId,
  }));
  const locale = getters.getLocale();
  const dataSetsData: FunctionResultObject[][] = dataSets
    .map((ds) => getData(getters, ds))
    .map((values) =>
      values.map(({ value, format }) =>
        value === null ? EMPTY : { value: formatValue(value, { format, locale }) }
      )
    );
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
export function getData(getters: EvaluationGetters, ds: DataSet): FunctionResultObject[] {
  if (ds.dataRange) {
    const labelCellZone = ds.labelCell ? [ds.labelCell.zone] : [];
    const dataZone = recomputeZones([ds.dataRange.zone], labelCellZone)[0];
    if (dataZone === undefined) {
      return [];
    }
    const dataRange = getters.getRangeFromZone(ds.dataRange.sheetId, dataZone);
    return getters
      .getVisibleRangeValues(dataRange)
      .map((cell) => (cell.value === "" ? EMPTY : cell));
  }
  return [];
}

const ChartNeverDataSourceHandler: ChartDataSourceBuilder<{ type: "none" }, { type: "none" }> = {
  supportedChartTypes: [],
  fromExternalDefinition: () => ({ type: "none" }),
  fromContextCreation: () => ({ type: "none" }),
  fromHierarchicalContextCreation: () => ({ type: "none" }),
  validate: () => CommandResult.Success,
  transform: () => ({ type: "none" }),
  extractData: () => ({ dataSetsValues: [], labelValues: [] }),
  extractHierarchicalData: () => ({ dataSetsValues: [], labelValues: [] }),
  adaptRanges: (dataSource) => dataSource,
  getDefinition: (dataSource) => dataSource,
  duplicateInDuplicatedSheet: (dataSource) => dataSource,
  getContextCreation: () => ({}),
  getHierarchicalContextCreation: () => ({}),
  toExcelDataSets: () => ({ dataSets: [], labelRanges: undefined }),
};

chartDataSourceRegistry.add("range", ChartRangeDataSourceHandler);
chartDataSourceRegistry.add("none", ChartNeverDataSourceHandler);
