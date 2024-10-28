import { ChartDataset, LinearScaleOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { transformZone } from "../../../collaborative/ot/ot_helpers";
import { LINE_FILL_TRANSPARENCY } from "../../../constants";
import {
  evaluatePolynomial,
  expM,
  getMovingAverageValues,
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
  Locale,
  LocaleFormat,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
  Zone,
} from "../../../types";
import {
  AxisDesign,
  ChartAxisFormats,
  ChartWithDataSetDefinition,
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
        useFixedReference: true,
      }),
    };
  }

  return {
    label,
    range: getters.getRangeString(dataRange, "forceSheetReference", { useFixedReference: true }),
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
  return getters.getRangeString(range, "forceSheetReference", { useFixedReference: true });
}

/**
 * Transform a chart definition which supports dataSets (dataSets and LabelRange)
 * with an executed command
 */
export function transformChartDefinitionWithDataSetsWithZone<T extends ChartWithDataSetDefinition>(
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

export function checkDataset(definition: ChartWithDataSetDefinition): CommandResult {
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

export function getDefinedAxis(definition: ChartWithDataSetDefinition): {
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

export function getChartAxis(
  definition: ChartWithDataSetDefinition,
  position: "left" | "right" | "bottom",
  type: "values" | "labels",
  options: LocaleFormat & { stacked?: boolean }
): DeepPartial<LinearScaleOptions> | undefined {
  const { useLeftAxis, useRightAxis } = getDefinedAxis(definition);
  if ((position === "left" && !useLeftAxis) || (position === "right" && !useRightAxis)) {
    return undefined;
  }

  const fontColor = chartFontColor(definition.background);
  let design: AxisDesign | undefined;
  if (position === "bottom") {
    design = definition.axesDesign?.x;
  } else if (position === "left") {
    design = definition.axesDesign?.y;
  } else {
    design = definition.axesDesign?.y1;
  }

  if (type === "values") {
    const displayGridLines =
      position === "left" ||
      (position === "right" && !useLeftAxis) ||
      (definition.type === "bar" && definition.horizontal === true);

    return {
      position: position,
      title: getChartAxisTitleRuntime(design),
      grid: {
        display: displayGridLines,
      },
      beginAtZero: true,
      stacked: options?.stacked,
      ticks: {
        color: fontColor,
        callback: formatTickValue(options),
      },
    };
  } else {
    return {
      ticks: {
        padding: 5,
        color: fontColor,
      },
      grid: {
        display: definition.type === "scatter",
      },
      stacked: options?.stacked,
      title: getChartAxisTitleRuntime(design),
    };
  }
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
  return getFullTrendingLineDataSet(dataset, config, newValues);
}

export function getFullTrendingLineDataSet(
  dataset: ChartDataset,
  config: TrendConfiguration,
  data: (number | null)[]
) {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);
  const backgroundRGBA = colorToRGBA(borderColor);
  // @ts-expect-error
  if (dataset?.fill) {
    backgroundRGBA.a = LINE_FILL_TRANSPARENCY; // to support area charts
  }

  return {
    ...dataset,
    type: "line",
    xAxisID: config.type !== "trailingMovingAverage" ? TREND_LINE_XAXIS_ID : "x",
    label: dataset.label ? _t("Trend line for %s", dataset.label) : "",
    data,
    order: -1,
    showLine: true,
    pointRadius: 0,
    backgroundColor: rgbaToHex(backgroundRGBA),
    borderColor,
    borderDash: [5, 5],
    borderWidth: undefined,
  };
}

export function interpolateData(
  config: TrendConfiguration,
  values: number[],
  labels: number[],
  newLabels: number[]
): (number | null)[] {
  if (values.length < 2 || labels.length < 2 || newLabels.length === 0) {
    return [];
  }
  switch (config.type) {
    case "polynomial": {
      const order = config.order ?? 2;
      if (order === 1) {
        return predictLinearValues([values], [labels], [newLabels], true)[0];
      }
      const coeffs = polynomialRegression(values, labels, order, true).flat();
      return newLabels.map((v) => evaluatePolynomial(coeffs, v, order));
    }
    case "exponential": {
      const positiveLogValues: number[] = [];
      const filteredLabels: number[] = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
          positiveLogValues.push(Math.log(values[i]));
          filteredLabels.push(labels[i]);
        }
      }
      if (!filteredLabels.length) {
        return [];
      }
      return expM(predictLinearValues([positiveLogValues], [filteredLabels], [newLabels], true))[0];
    }
    case "logarithmic": {
      return predictLinearValues([values], logM([labels]), logM([newLabels]), true)[0];
    }
    case "trailingMovingAverage": {
      return getMovingAverageValues(values, config.window);
    }
    default:
      return [];
  }
}

export function formatChartDatasetValue(axisFormats: ChartAxisFormats, locale: Locale) {
  return (value: any, axisId: string | undefined) => {
    const format = axisId ? axisFormats?.[axisId] : undefined;
    return formatTickValue({ format, locale })(value);
  };
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

export function getChartColorsGenerator(
  definition: ChartWithDataSetDefinition,
  dataSetsSize: number
) {
  return new ColorGenerator(
    dataSetsSize,
    definition.dataSets.map((ds) => ds.backgroundColor)
  );
}

export const CHART_AXIS_CHOICES = [
  { value: "left", label: _t("Left") },
  { value: "right", label: _t("Right") },
];
