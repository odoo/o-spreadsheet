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
import { Getters } from "../../../types/getters";
import { FunctionResultObject } from "../../../types/misc";
import { Range } from "../../../types/range";
import { isErrorResult, isNumberResult, isTextResult } from "../../cells/cell_evaluation";
import { formatValue } from "../../format/format";
import { isDefined } from "../../misc";
import { createValidRange, duplicateRangeInDuplicatedSheet } from "../../range";
import { recomputeZones } from "../../recompute_zones";
import { getZoneArea } from "../../zones";
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

export const ChartRangeDataSourceHandler: ChartDataSourceBuilder<
  ChartRangeDataSource<string>,
  ChartRangeDataSource<Range>
> = {
  supportedChartTypes: CHART_TYPES,
  fromExternalDefinition(dataSource, defaultSheetId, getters) {
    const dataSets = createDataSets(getters, defaultSheetId, dataSource);
    const labelRanges = dataSource.labelRanges
      ?.map((lr) => createValidRange(getters, defaultSheetId, lr))
      .filter(isDefined);
    return {
      ...dataSource,
      dataSets,
      labelRanges: labelRanges?.length ? labelRanges : undefined,
    };
  },

  fromContextCreation(context) {
    const dsLabelRanges =
      context.dataSource?.type === "range" ? context.dataSource.labelRanges : undefined;
    const primaryRange = context.auxiliaryRange;
    let labelRanges: string[] | undefined;
    if (dsLabelRanges?.length) {
      labelRanges =
        !primaryRange || dsLabelRanges[0] === primaryRange
          ? dsLabelRanges
          : [primaryRange, ...dsLabelRanges];
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
    // All label ranges (multi-level X-axis) become hierarchy columns; first dataset becomes value column
    // Reverse so that the most specific level (first label range) becomes the deepest hierarchy
    const categoryRanges: string[] = dsLabelRanges?.length
      ? dsLabelRanges
      : context.auxiliaryRange
      ? [context.auxiliaryRange]
      : [];
    return {
      type: "range",
      dataSets: [...categoryRanges]
        .reverse()
        .map((range, i) => ({ dataRange: range, dataSetId: String(i) })),
      dataSetsHaveTitle,
      labelRanges: firstDataRange ? [firstDataRange] : undefined,
    };
  },

  validate: (dataSource, validator) =>
    validator.checkValidations(dataSource, checkDataset, checkLabelRange),

  transform(dataSource, defaultSheetId, { adaptRangeString }) {
    let labelRanges: string[] | undefined;
    if (dataSource.labelRanges?.length) {
      const adaptedLabelRanges: string[] = [];
      for (const lr of dataSource.labelRanges) {
        const { changeType, range: adaptedRange } = adaptRangeString(defaultSheetId, lr);
        if (changeType !== "REMOVE") {
          adaptedLabelRanges.push(adaptedRange);
        }
      }
      if (adaptedLabelRanges.length) {
        labelRanges = adaptedLabelRanges;
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
      ...(labelRanges ? { labelRanges } : {}),
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
    let labelRanges: Range[] | undefined;
    if (dataSource.labelRanges?.length) {
      const adaptedLabelRanges: Range[] = [];
      for (const lr of dataSource.labelRanges) {
        const { range: adaptedLabelRange, changeType } = applyChange(lr);
        if (
          changeType !== "REMOVE" &&
          !adaptedLabelRange.invalidSheetName &&
          !adaptedLabelRange.invalidXc
        ) {
          adaptedLabelRanges.push(adaptedLabelRange);
        }
      }
      labelRanges = adaptedLabelRanges.length ? adaptedLabelRanges : undefined;
    }

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
    auxiliaryRange: dataSource.labelRanges?.filter(isDefined)?.[0],
    dataSource,
  }),

  getHierarchicalContextCreation(dataSource) {
    const dataSetsHaveTitle = dataSource.dataSetsHaveTitle;
    // In hierarchical charts: dataSets = category/hierarchy columns (broad → specific), labelRanges[0] = value column
    // Reverse so the most specific level becomes labelRanges[0] in the resulting flat chart
    const categoryColumns = [...dataSource.dataSets].reverse();
    const valueColumn = dataSource.labelRanges?.[0];
    const [firstCategory, ...remainingCategories] = categoryColumns;
    const firstCategoryRange = firstCategory?.dataRange;
    return {
      auxiliaryRange: firstCategoryRange || undefined,
      hierarchicalDataSource: dataSource,
      dataSource: {
        type: "range",
        dataSets: valueColumn ? [{ dataRange: valueColumn, dataSetId: "0" }] : [],
        dataSetsHaveTitle,
        ...(remainingCategories.length && {
          labelRanges: remainingCategories.map((c) => c.dataRange).filter(isDefined),
        }),
      },
    };
  },

  toExcelDataSets(dataSource, dataSetStyles, getters) {
    const dataSets = dataSource.dataSets;
    const labelRange = dataSource.labelRanges?.[0];
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

export function getChartData(getters: Getters, dataSource: ChartRangeDataSource): ChartData {
  const dataSets = dataSource.dataSets;
  const labelRanges = dataSource.labelRanges;
  const labelValues = getChartLabelValues(getters, dataSets, labelRanges?.[0]);
  const dataSetsValues = getChartDatasetValues(getters, dataSets);
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
    data.secondaryLabelValues = dataSource.labelRanges.slice(1).map((lr) => {
      const values = getChartLabelValues(getters, dataSets, lr);
      if (
        removeFirstLabel &&
        shouldRemoveFirstLabel(
          values.length,
          numberOfDataPoints,
          dataSource.dataSetsHaveTitle || false
        )
      ) {
        values.shift();
      }
      return values;
    });
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
      data.every((cell) => !cell.value || isTextResult(cell)) &&
      data.filter(isTextResult).length > 1
    ) {
      // Convert categorical data into counts
      data = data.map((cell) => (cell.value && isErrorResult(cell) ? ONE : EMPTY));
    } else if (data.every((cell) => !isNumberResult(cell))) {
      hidden = true;
    }
    datasetValues.push({ data, label, hidden, dataSetId: ds.dataSetId });
  }
  return datasetValues;
}

function getChartLabelValues(
  getters: Getters,
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
function getHierarchicalDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
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
export function getData(getters: Getters, ds: DataSet): FunctionResultObject[] {
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
  toExcelDataSets: () => ({ dataSets: [], labelRange: undefined }),
};

chartDataSourceRegistry.add("range", ChartRangeDataSourceHandler);
chartDataSourceRegistry.add("none", ChartNeverDataSourceHandler);
