import { DEFAULT_WINDOW_SIZE, MAX_CHAR_LABEL } from "../../../constants";
import { _t } from "../../../translation";
import {
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  DOMCoordinates,
  DOMDimension,
  Getters,
  Locale,
  LocaleFormat,
  Range,
  RangeAdapter,
  UID,
  UnboundedZone,
  Zone,
} from "../../../types";
import {
  ChartAxisFormats,
  ChartWithDataSetDefinition,
  CustomizedDataSet,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  ExcelChartTrendConfiguration,
  GenericDefinition,
} from "../../../types/chart/chart";
import { CellErrorType } from "../../../types/errors";
import { MAX_XLSX_POLYNOMIAL_DEGREE } from "../../../xlsx/constants";
import { ColorGenerator, relativeLuminance } from "../../color";
import { formatValue, humanizeNumber } from "../../format/format";
import { adaptStringRange } from "../../formulas";
import { isDefined, largeMax } from "../../misc";
import { createRange, duplicateRangeInDuplicatedSheet } from "../../range";
import { rangeReference } from "../../references";
import { getZoneArea, isFullRow, toUnboundedZone, zoneToDimension, zoneToXc } from "../../zones";

export const TREND_LINE_XAXIS_ID = "x1";
export const MOVING_AVERAGE_TREND_LINE_XAXIS_ID = "xMovingAverage";
export const SPREADSHEET_TO_EXCEL_TRENDLINE_TYPE_MAPPING = {
  exponential: "exp",
  logarithmic: "log",
  polynomial: "poly",
  trailingMovingAverage: "movingAvg",
} as const;

/**
 * This file contains helpers that are common to different charts (mainly
 * line, bar and pie charts)
 */

/**
 * Adapt ranges of a chart which support DataSet (dataSets and LabelRange).
 */
export function updateChartRangesWithDataSets(
  getters: CoreGetters,
  applyChange: ApplyRangeChange,
  chartDataSets: DataSet[],
  chartLabelRange?: Range
) {
  let isStale = false;
  const dataSetsWithUndefined: (DataSet | undefined)[] = [];
  for (const index in chartDataSets) {
    let ds: DataSet | undefined = chartDataSets[index]!;
    if (ds.labelCell) {
      const labelCell = adaptChartRange(ds.labelCell, applyChange);
      if (ds.labelCell !== labelCell) {
        isStale = true;
        ds = {
          ...ds,
          labelCell: labelCell,
        };
      }
    }
    if (ds.pointLabelRange) {
      const pointLabelRange = adaptChartRange(ds.pointLabelRange, applyChange);
      if (pointLabelRange !== ds.pointLabelRange) {
        isStale = true;
        ds = {
          ...ds,
          pointLabelRange,
        };
      }
    }
    const dataRange = adaptChartRange(ds.dataRange, applyChange);
    if (
      dataRange === undefined ||
      getters.getRangeString(dataRange, dataRange.sheetId) === CellErrorType.InvalidReference
    ) {
      isStale = true;
      ds = undefined;
    } else if (dataRange !== ds.dataRange) {
      isStale = true;
      ds = {
        ...ds,
        dataRange,
      };
    }
    dataSetsWithUndefined[index] = ds;
  }
  let labelRange = chartLabelRange;
  const range = adaptChartRange(labelRange, applyChange);
  if (range !== labelRange) {
    isStale = true;
    labelRange = range;
  }
  const dataSets = dataSetsWithUndefined.filter(isDefined);
  return {
    isStale,
    dataSets,
    labelRange,
  };
}

/**
 * Duplicate the dataSets. All ranges on sheetIdFrom are adapted to target
 * sheetIdTo.
 */
export function duplicateDataSetsInDuplicatedSheet(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  dataSets: DataSet[]
): DataSet[] {
  return dataSets.map((ds) => {
    return {
      dataRange: duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, ds.dataRange),
      labelCell: ds.labelCell
        ? duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, ds.labelCell)
        : undefined,
      pointLabelRange: ds.pointLabelRange
        ? duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, ds.pointLabelRange)
        : undefined,
    };
  });
}

/**
 * Duplicate a range. If the range is on the sheetIdFrom, the range will target
 * sheetIdTo.
 */
export function duplicateLabelRangeInDuplicatedSheet(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  range?: Range
): Range | undefined {
  return range ? duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, range) : undefined;
}

/**
 * Adapt a single range of a chart
 */
export function adaptChartRange(
  range: Range | undefined,
  applyChange: ApplyRangeChange
): Range | undefined {
  if (!range) {
    return undefined;
  }
  const change = applyChange(range);
  switch (change.changeType) {
    case "NONE":
      return range;
    case "REMOVE":
      return undefined;
    default:
      return change.range;
  }
}

/**
 * Create the dataSet objects from xcs
 */
export function createDataSets(
  getters: CoreGetters,
  customizedDataSets: CustomizedDataSet[],
  sheetId: UID,
  dataSetsHaveTitle: boolean
): DataSet[] {
  const dataSets: DataSet[] = [];
  for (const dataSet of customizedDataSets) {
    const dataRange = getters.getRangeFromSheetXC(sheetId, dataSet.dataRange);
    const { unboundedZone: zone, sheetId: dataSetSheetId, invalidSheetName, invalidXc } = dataRange;
    if (invalidSheetName || invalidXc) {
      continue;
    }
    const pointLabelRange = dataSet.pointLabelRange
      ? getters.getRangeFromSheetXC(sheetId, dataSet.pointLabelRange)
      : undefined;
    // It's a rectangle. We treat all columns (arbitrary) as different data series.
    if (zone.left !== zone.right && zone.top !== zone.bottom) {
      if (zone.right === undefined) {
        // Should never happens because of the allowDispatch of charts, but just making sure
        continue;
      }

      for (let column = zone.left; column <= zone.right; column++) {
        const columnZone = {
          ...zone,
          left: column,
          right: column,
        };
        dataSets.push({
          ...createDataSet(
            getters,
            dataSetSheetId,
            columnZone,
            dataSetsHaveTitle
              ? {
                  top: columnZone.top,
                  bottom: columnZone.top,
                  left: columnZone.left,
                  right: columnZone.left,
                }
              : undefined
          ),
          backgroundColor: dataSet.backgroundColor,
          rightYAxis: dataSet.yAxisId === "y1",
          customLabel: dataSet.label,
          trend: dataSet.trend,
          pointLabelRange,
        });
      }
    } else {
      /* 1 cell, 1 row or 1 column */
      dataSets.push({
        ...createDataSet(
          getters,
          dataSetSheetId,
          zone,
          dataSetsHaveTitle
            ? {
                top: zone.top,
                bottom: zone.top,
                left: zone.left,
                right: zone.left,
              }
            : undefined
        ),
        backgroundColor: dataSet.backgroundColor,
        rightYAxis: dataSet.yAxisId === "y1",
        customLabel: dataSet.label,
        trend: dataSet.trend,
        pointLabelRange,
      });
    }
  }
  return dataSets;
}

function createDataSet(
  getters: CoreGetters,
  sheetId: UID,
  fullZone: Zone | UnboundedZone,
  titleZone: Zone | UnboundedZone | undefined
): DataSet {
  if (fullZone.left !== fullZone.right && fullZone.top !== fullZone.bottom) {
    throw new Error(`Zone should be a single column or row: ${zoneToXc(fullZone)}`);
  }
  if (titleZone) {
    const dataXC = zoneToXc(fullZone);
    const labelCellXC = zoneToXc(titleZone);
    return {
      labelCell: getters.getRangeFromSheetXC(sheetId, labelCellXC),
      dataRange: getters.getRangeFromSheetXC(sheetId, dataXC),
    };
  } else {
    return {
      labelCell: undefined,
      dataRange: getters.getRangeFromSheetXC(sheetId, zoneToXc(fullZone)),
    };
  }
}

/**
 * Transform a dataSet to a ExcelDataSet
 */
export function toExcelDataset(getters: CoreGetters, ds: DataSet): ExcelChartDataset {
  const labelZone = ds.labelCell?.zone;
  let dataZone = ds.dataRange.zone;
  if (labelZone) {
    const { numberOfRows, numberOfCols } = zoneToDimension(dataZone);
    if (numberOfRows === 1) {
      dataZone = { ...dataZone, left: dataZone.left + 1 };
    } else if (numberOfCols === 1) {
      dataZone = { ...dataZone, top: dataZone.top + 1 };
    }
  }

  const dataRange = createRange({ ...ds.dataRange, zone: dataZone }, getters.getSheetSize);
  let label = {};
  if (ds.customLabel) {
    label = {
      text: ds.customLabel,
    };
  } else if (ds.labelCell) {
    label = {
      reference: getters.getRangeString(ds.labelCell, "forceSheetReference", {
        useBoundedReference: true,
      }),
    };
  }

  let trend: ExcelChartTrendConfiguration | undefined;
  if (ds.trend?.type) {
    trend = {
      type:
        ds.trend.type === "polynomial" && ds.trend.order === 1
          ? "linear"
          : SPREADSHEET_TO_EXCEL_TRENDLINE_TYPE_MAPPING[ds.trend.type],
      color: ds.trend.color,
      order: ds.trend.order ? Math.min(ds.trend.order, MAX_XLSX_POLYNOMIAL_DEGREE) : undefined,
      window: ds.trend.window || DEFAULT_WINDOW_SIZE,
    };
  }
  return {
    label,
    range: getters.getRangeString(dataRange, "forceSheetReference", { useBoundedReference: true }),
    backgroundColor: ds.backgroundColor,
    rightYAxis: ds.rightYAxis,
    trend,
  };
}

export function toExcelLabelRange(
  getters: CoreGetters,
  labelRange: Range | undefined,
  shouldRemoveFirstLabel?: boolean
) {
  if (!labelRange) return undefined;
  const zone = {
    ...labelRange.zone,
  };
  if (shouldRemoveFirstLabel && labelRange.zone.bottom > labelRange.zone.top) {
    zone.top = zone.top + 1;
  }
  const range = createRange({ ...labelRange, zone: zone }, getters.getSheetSize);
  return getters.getRangeString(range, "forceSheetReference", { useBoundedReference: true });
}

/**
 * Transform a chart definition which supports dataSets (dataSets and LabelRange)
 * with an executed command
 */
export function transformChartDefinitionWithDataSetsWithZone<T extends ChartWithDataSetDefinition>(
  chartSheetId: UID,
  definition: T,
  applyChange: RangeAdapter
): T {
  let labelRange: string | undefined;
  if (definition.labelRange) {
    const adaptedRange = adaptStringRange(chartSheetId, definition.labelRange, applyChange);
    if (adaptedRange !== CellErrorType.InvalidReference) {
      labelRange = adaptedRange;
    }
  }

  const dataSets: CustomizedDataSet[] = [];
  for (const dataSet of definition.dataSets) {
    const newDataSet = { ...dataSet };
    const adaptedRange = adaptStringRange(chartSheetId, dataSet.dataRange, applyChange);

    if (adaptedRange !== CellErrorType.InvalidReference) {
      newDataSet.dataRange = adaptedRange;
      if (dataSet.pointLabelRange) {
        const adaptedPointLabelRange = adaptStringRange(
          chartSheetId,
          dataSet.pointLabelRange,
          applyChange
        );
        if (adaptedPointLabelRange !== CellErrorType.InvalidReference) {
          newDataSet.pointLabelRange = adaptedPointLabelRange;
        } else {
          delete newDataSet.pointLabelRange;
        }
      }
      dataSets.push(newDataSet);
    }
  }

  return {
    ...definition,
    dataSets,
    labelRange,
  };
}

/**
 * Choose a font color based on a background color.
 * The font is white with a dark background.
 */
export function chartFontColor(backgroundColor: Color | undefined): Color {
  if (!backgroundColor) {
    return "#000000";
  }
  return relativeLuminance(backgroundColor) < 0.3 ? "#FFFFFF" : "#000000";
}

export function chartMutedFontColor(backgroundColor: Color | undefined): Color {
  if (!backgroundColor) {
    return "#666666";
  }
  return relativeLuminance(backgroundColor) < 0.3 ? "#C8C8C8" : "#666666";
}

export function checkDataset(definition: ChartWithDataSetDefinition): CommandResult {
  if (definition.dataSets) {
    const invalidRanges =
      definition.dataSets.find((range) => !rangeReference.test(range.dataRange)) !== undefined;
    if (invalidRanges) {
      return CommandResult.InvalidDataSet;
    }
    const invalidPointLabelRanges =
      definition.dataSets.find(
        (range) => range.pointLabelRange && !rangeReference.test(range.pointLabelRange)
      ) !== undefined;
    if (invalidPointLabelRanges) {
      return CommandResult.InvalidDataSet;
    }
    const zones = definition.dataSets.map((ds) => toUnboundedZone(ds.dataRange));
    if (zones.some((zone) => zone.top !== zone.bottom && isFullRow(zone))) {
      return CommandResult.InvalidDataSet;
    }
  }
  return CommandResult.Success;
}

export function checkLabelRange(definition: ChartWithDataSetDefinition): CommandResult {
  if (definition.labelRange) {
    const invalidLabels = !rangeReference.test(definition.labelRange || "");
    if (invalidLabels) {
      return CommandResult.InvalidLabelRange;
    }
  }
  return CommandResult.Success;
}

export function shouldRemoveFirstLabel(
  labelRange: Range | undefined,
  dataset: DataSet | undefined,
  dataSetsHaveTitle: boolean
) {
  if (!dataSetsHaveTitle) return false;
  if (!labelRange) return false;
  if (!dataset) return true;
  const datasetLength = getZoneArea(dataset.dataRange.zone);
  const labelLength = getZoneArea(labelRange.zone);
  if (labelLength < datasetLength) {
    return false;
  }
  return true;
}

export function getChartPositionAtCenterOfViewport(
  getters: Getters,
  chartSize: DOMDimension
): DOMCoordinates {
  const { x, y } = getters.getMainViewportCoordinates();
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
  const { width, height } = getters.getVisibleRect(getters.getActiveMainViewport());

  return {
    x: x + scrollX + Math.max(0, (width - chartSize.width) / 2),
    y: y + scrollY + Math.max(0, (height - chartSize.height) / 2),
  }; // Position at the center of the scrollable viewport
}

export function getDefinedAxis(definition: GenericDefinition<ChartWithDataSetDefinition>): {
  useLeftAxis: boolean;
  useRightAxis: boolean;
} {
  let useLeftAxis = false,
    useRightAxis = false;
  if ("horizontal" in definition && definition.horizontal) {
    return { useLeftAxis: true, useRightAxis: false };
  }
  for (const design of definition.dataSets || []) {
    if (design.yAxisId === "y1") {
      useRightAxis = true;
    } else {
      useLeftAxis = true;
    }
  }
  useLeftAxis ||= !useRightAxis;
  return { useLeftAxis, useRightAxis };
}

export function formatChartDatasetValue(
  axisFormats: ChartAxisFormats,
  locale: Locale,
  humanizeNumbers: boolean = false
) {
  return (value: any, axisId: string) => {
    const format = axisFormats?.[axisId];
    return formatTickValue({ format, locale }, humanizeNumbers)(value);
  };
}

export function formatTickValue(localeFormat: LocaleFormat, humanizeNumbers: boolean = false) {
  return (value: any) => {
    value = Number(value);
    if (isNaN(value)) return value;
    const { locale, format } = localeFormat;
    const formattedValue = humanizeNumbers
      ? humanizeNumber({ value, format }, locale)
      : formatValue(value, {
          locale,
          format: !format && Math.abs(value) >= 1000 ? "#,##" : format,
        });
    return truncateLabel(formattedValue);
  };
}

export const CHART_AXIS_CHOICES = [
  { value: "left", label: _t("Left") },
  { value: "right", label: _t("Right") },
];

export function getPieColors(colors: ColorGenerator, dataSetsValues: DatasetValues[]): Color[] {
  const pieColors: Color[] = [];
  const maxLength = largeMax(dataSetsValues.map((ds) => ds.data.length));
  for (let i = 0; i <= maxLength; i++) {
    pieColors.push(colors.next());
  }

  return pieColors;
}

export function truncateLabel(label: string | undefined, maxLen: number = MAX_CHAR_LABEL): string {
  if (!label) {
    return "";
  }
  if (label.length > maxLen) {
    return label.substring(0, maxLen) + "…";
  }
  return label;
}

export function isTrendLineAxis(axisID: string) {
  return axisID === TREND_LINE_XAXIS_ID || axisID === MOVING_AVERAGE_TREND_LINE_XAXIS_ID;
}
