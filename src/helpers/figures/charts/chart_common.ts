import { ChartDataset } from "chart.js";
import { transformZone } from "../../../collaborative/ot/ot_helpers";
import {
  evaluatePolynomial,
  expM,
  logM,
  polynomialRegression,
  predictLinearValues,
} from "../../../functions/helper_statistical";
import { _t } from "../../../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  DOMCoordinates,
  DOMDimension,
  Getters,
  LocaleFormat,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
  Zone,
} from "../../../types";
import {
  AxisDesign,
  ChartWithAxisDefinition,
  CustomizedDataSet,
  DataSet,
  ExcelChartDataset,
  TrendConfiguration,
} from "../../../types/chart/chart";
import { CellErrorType } from "../../../types/errors";
import {
  ColorGenerator,
  colorToRGBA,
  lightenColor,
  relativeLuminance,
  rgbaToHex,
} from "../../color";
import { formatValue } from "../../format/format";
import { isDefined, range } from "../../misc";
import { copyRangeWithNewSheetId } from "../../range";
import { rangeReference } from "../../references";
import { getZoneArea, isFullRow, toUnboundedZone, zoneToDimension, zoneToXc } from "../../zones";

export const TREND_LINE_XAXIS_ID = "x1";

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
  for (let index in chartDataSets) {
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
 * Copy the dataSets given. All the ranges which are on sheetIdFrom will target
 * sheetIdTo.
 */
export function copyDataSetsWithNewSheetId(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  dataSets: DataSet[]
): DataSet[] {
  return dataSets.map((ds) => {
    return {
      dataRange: copyRangeWithNewSheetId(sheetIdFrom, sheetIdTo, ds.dataRange),
      labelCell: ds.labelCell
        ? copyRangeWithNewSheetId(sheetIdFrom, sheetIdTo, ds.labelCell)
        : undefined,
    };
  });
}

/**
 * Copy a range. If the range is on the sheetIdFrom, the range will target
 * sheetIdTo.
 */
export function copyLabelRangeWithNewSheetId(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  range?: Range
): Range | undefined {
  return range ? copyRangeWithNewSheetId(sheetIdFrom, sheetIdTo, range) : undefined;
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

  const dataRange = ds.dataRange.clone({ zone: dataZone });
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

  return {
    label,
    range: getters.getRangeString(dataRange, "forceSheetReference", { useBoundedReference: true }),
    backgroundColor: ds.backgroundColor,
    rightYAxis: ds.rightYAxis,
  };
}

export function toExcelLabelRange(
  getters: CoreGetters,
  labelRange: Range | undefined,
  shouldRemoveFirstLabel?: boolean
) {
  if (!labelRange) return undefined;
  let zone = {
    ...labelRange.zone,
  };
  if (shouldRemoveFirstLabel && labelRange.zone.bottom > labelRange.zone.top) {
    zone.top = zone.top + 1;
  }
  const range = labelRange.clone({ zone });
  return getters.getRangeString(range, "forceSheetReference", { useBoundedReference: true });
}

/**
 * Transform a chart definition which supports dataSets (dataSets and LabelRange)
 * with an executed command
 */
export function transformChartDefinitionWithDataSetsWithZone<T extends ChartWithAxisDefinition>(
  definition: T,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): T {
  let labelRange: string | undefined;
  if (definition.labelRange) {
    const labelZone = transformZone(toUnboundedZone(definition.labelRange), executed);
    labelRange = labelZone ? zoneToXc(labelZone) : undefined;
  }
  const dataSets: CustomizedDataSet[] = definition.dataSets
    .map((ds) => toUnboundedZone(ds.dataRange))
    .map((zone) => transformZone(zone, executed))
    .filter(isDefined)
    .map((xc) => ({ dataRange: zoneToXc(xc) }));
  return {
    ...definition,
    labelRange,
    dataSets,
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

export function checkDataset(definition: ChartWithAxisDefinition): CommandResult {
  if (definition.dataSets) {
    const invalidRanges =
      definition.dataSets.find((range) => !rangeReference.test(range.dataRange)) !== undefined;
    if (invalidRanges) {
      return CommandResult.InvalidDataSet;
    }
    const zones = definition.dataSets.map((ds) => toUnboundedZone(ds.dataRange));
    if (zones.some((zone) => zone.top !== zone.bottom && isFullRow(zone))) {
      return CommandResult.InvalidDataSet;
    }
  }
  return CommandResult.Success;
}

export function checkLabelRange(definition: ChartWithAxisDefinition): CommandResult {
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

  const position = {
    x: x + scrollX + Math.max(0, (width - chartSize.width) / 2),
    y: y + scrollY + Math.max(0, (height - chartSize.height) / 2),
  }; // Position at the center of the scrollable viewport

  return position;
}

export function getChartAxisTitleRuntime(design?: AxisDesign):
  | {
      display: boolean;
      text: string;
      color?: string;
      font: {
        style: "italic" | "normal";
        weight: "bold" | "normal";
      };
      align: "start" | "center" | "end";
    }
  | undefined {
  if (design?.title?.text) {
    const { text, color, align, italic, bold } = design.title;
    return {
      display: true,
      text,
      color,
      font: {
        style: italic ? "italic" : "normal",
        weight: bold ? "bold" : "normal",
      },
      align: align === "left" ? "start" : align === "right" ? "end" : "center",
    };
  }
  return;
}

export function getDefinedAxis(definition: ChartWithAxisDefinition): {
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

export function computeChartPadding({
  displayTitle,
  displayLegend,
}: {
  displayTitle: boolean;
  displayLegend: boolean;
}): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  let top = 25;
  if (displayTitle) {
    top = 0;
  } else if (displayLegend) {
    top = 10;
  }
  return { left: 20, right: 20, top, bottom: 10 };
}

export function getTrendDatasetForBarChart(
  config: TrendConfiguration,
  dataset: ChartDataset<"bar" | "line", number[]>
) {
  const filteredValues: number[] = [];
  const filteredLabels: number[] = [];
  const labels: number[] = [];
  if (dataset.hidden) {
    return;
  }
  for (let i = 0; i < dataset.data.length; i++) {
    if (typeof dataset.data[i] === "number") {
      filteredValues.push(dataset.data[i]);
      filteredLabels.push(i + 1);
    }
    labels.push(i + 1);
  }

  const newLabels = range(0.5, labels.length + 0.55, 0.2);
  const newValues = interpolateData(config, filteredValues, filteredLabels, newLabels);
  if (!newValues.length) {
    return;
  }
  return getFullTrendingLineDataSet(dataset, config, newValues, newLabels);
}

export function getFullTrendingLineDataSet(
  dataset: ChartDataset<"line" | "bar">,
  config: TrendConfiguration,
  data: number[],
  labels: number[]
) {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);

  return {
    type: "line",
    xAxisID: TREND_LINE_XAXIS_ID,
    yAxisID: dataset.yAxisID,
    label: dataset.label ? _t("Trend line for %s", dataset.label) : "",
    data: data.map((v, i) => ({ x: labels[i], y: v })),
    order: -1,
    showLine: true,
    pointRadius: 0,
    backgroundColor: borderColor,
    borderColor,
    borderDash: [5, 5],
    borderWidth: undefined,
    fill: false,
    pointBackgroundColor: borderColor,
  };
}

export function interpolateData(
  config: TrendConfiguration,
  values: number[],
  labels: number[],
  newLabels: number[]
): number[] {
  if (values.length < 2 || labels.length < 2 || newLabels.length === 0) {
    return [];
  }
  const { normalizedLabels, normalizedNewLabels } = normalizeLabels(labels, newLabels, config);
  try {
    switch (config.type) {
      case "polynomial": {
        const order = config.order;
        if (!order) {
          return Array.from({ length: newLabels.length }, () => NaN);
        }
        if (order === 1) {
          return predictLinearValues([values], [normalizedLabels], [normalizedNewLabels], true)[0];
        }
        const coeffs = polynomialRegression(values, normalizedLabels, order, true).flat();
        return normalizedNewLabels.map((v) => evaluatePolynomial(coeffs, v, order));
      }
      case "exponential": {
        const positiveLogValues: number[] = [];
        const filteredLabels: number[] = [];
        for (let i = 0; i < values.length; i++) {
          if (values[i] > 0) {
            positiveLogValues.push(Math.log(values[i]));
            filteredLabels.push(normalizedLabels[i]);
          }
        }
        if (!filteredLabels.length) {
          return Array.from({ length: newLabels.length }, () => NaN);
        }
        return expM(
          predictLinearValues([positiveLogValues], [filteredLabels], [normalizedNewLabels], true)
        )[0];
      }
      case "logarithmic": {
        return predictLinearValues(
          [values],
          logM([normalizedLabels]),
          logM([normalizedNewLabels]),
          true
        )[0];
      }
      default:
        return [];
    }
  } catch (e) {
    return Array.from({ length: newLabels.length }, () => NaN);
  }
}

function normalizeLabels(
  labels: number[],
  newLabels: number[],
  config: TrendConfiguration
): { normalizedLabels: number[]; normalizedNewLabels: number[] } {
  let normalizedLabels: number[] = [];
  let normalizedNewLabels: number[] = [];
  if (config.type === "logarithmic") {
    // Logarithmic trends in charts are used to visualize proportional growth or
    // relative changes. Therefore, we change the normalization technique for
    // logarithmic trend lines for a better fit. The method used here is Max Absolute
    // Scaling. This Technique is ideal for data spanning several orders of magnitude,
    // as it balances differences between small and large values by compressing larger
    // values while preserving proportionality and ensuring all values are scaled relative
    // to the largest magnitude.
    const labelMax = Math.max(...labels.map(Math.abs));
    normalizedLabels = labels.map((l) => l / labelMax);
    normalizedNewLabels = newLabels.map((l) => l / labelMax);
  } else {
    const labelMax = Math.max(...labels);
    const labelMin = Math.min(...labels);
    const labelRange = labelMax - labelMin;
    normalizedLabels = labels.map((l) => (l - labelMax) / labelRange);
    normalizedNewLabels = newLabels.map((l) => (l - labelMax) / labelRange);
  }
  return { normalizedLabels, normalizedNewLabels };
}

export function formatTickValue(localeFormat: LocaleFormat) {
  return (value: any) => {
    value = Number(value);
    if (isNaN(value)) return value;
    const { locale, format } = localeFormat;
    return formatValue(value, {
      locale,
      format: !format && Math.abs(value) >= 1000 ? "#,##" : format,
    });
  };
}

export function getChartColorsGenerator(definition: ChartWithAxisDefinition, dataSetsSize: number) {
  return new ColorGenerator(
    dataSetsSize,
    definition.dataSets.map((ds) => ds.backgroundColor)
  );
}

export const CHART_AXIS_CHOICES = [
  { value: "left", label: _t("Left") },
  { value: "right", label: _t("Right") },
];
