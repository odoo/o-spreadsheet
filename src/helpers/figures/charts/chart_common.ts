import { ChartDataset } from "chart.js";
import { transformZone } from "../../../collaborative/ot/ot_helpers";
import { LINE_FILL_TRANSPARENCY } from "../../../constants";
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
  AbstractChartAxesDesign,
  AbstractChartTitle,
  AxesDesign,
  ChartAxisTitleRuntime,
  ChartDefinition,
  ChartWithAxisDefinition,
  CustomizedDataSet,
  DataSet,
  ExcelChartDataset,
  Title,
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
import { copyRangeWithNewSheetId, createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { getZoneArea, isFullRow, toUnboundedZone, zoneToDimension, zoneToXc } from "../../zones";

export const TREND_LINE_XAXIS_ID = "x1";

/**
 * This file contains helpers that are common to different charts (mainly
 * line, bar and pie charts)
 */

/**
 * Update chart ranges, including data sets, chart title, axes design, and label range.
 */
export function updateChartRangesWithDataSets(
  getters: CoreGetters,
  applyChange: ApplyRangeChange,
  chartDataSets: DataSet[],
  chartTitle: AbstractChartTitle,
  axesDesign?: AbstractChartAxesDesign,
  chartLabelRange?: Range
) {
  let isStale = false;

  // Update the dataSets
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

  // Update the labelRange
  let labelRange = chartLabelRange;
  const range = adaptChartRange(labelRange, applyChange);
  if (range !== labelRange) {
    isStale = true;
    labelRange = range;
  }

  // Update the chart title
  let title = chartTitle;
  if (title.type === "reference") {
    const range = adaptChartRange(title.reference, applyChange);
    if (range !== title.reference) {
      isStale = true;
      title = {
        ...title,
        reference: range,
      };
    }
  }

  // Update the axesDesign
  let updatedAxesDesign: AbstractChartAxesDesign | undefined = undefined;
  if (axesDesign) {
    updatedAxesDesign = {};
    for (const [key, value] of Object.entries(axesDesign)) {
      if (value.type === "reference") {
        const range = adaptChartRange(value.reference, applyChange);
        if (range !== value.reference) {
          isStale = true;
          updatedAxesDesign[key] = {
            ...value,
            reference: range,
          };
        } else {
          updatedAxesDesign[key] = value;
        }
      } else {
        updatedAxesDesign[key] = value;
      }
    }
  }

  const dataSets = dataSetsWithUndefined.filter(isDefined);
  return {
    isStale,
    dataSets,
    title,
    axesDesign: updatedAxesDesign,
    labelRange,
  };
}

/**
 * Update the title ranges for scorecard and gauge charts.
 */
export function updateTitleRangesForScorecardAndGaugeCharts(
  applyChange: ApplyRangeChange,
  title: AbstractChartTitle
) {
  let isStale = false;
  let updatedTitle = title;
  if (title.type === "reference") {
    const range = adaptChartRange(title.reference, applyChange);
    if (range !== title.reference) {
      isStale = true;
      updatedTitle = {
        ...title,
        reference: range,
      };
    }
  }
  return {
    isStale,
    title: updatedTitle,
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
 * Copy a title reference. If the title is a reference to a range on the
 * sheetIdFrom, the range will target sheetIdTo.
 */
export function copyChartTitleReferenceWithNewSheetId(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  title: AbstractChartTitle
): AbstractChartTitle {
  if (title.type === "reference") {
    return {
      ...title,
      reference: title.reference
        ? copyRangeWithNewSheetId(sheetIdFrom, sheetIdTo, title.reference)
        : undefined,
    };
  }

  return title;
}

/**
 * Copy the axesDesign given. All the ranges which are on sheetIdFrom will target
 * sheetIdTo.
 */
export function copyAxesDesignWithNewSheetId(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  axesDesign?: AbstractChartAxesDesign
): AbstractChartAxesDesign | undefined {
  if (!axesDesign) {
    return undefined;
  }
  const newAxesDesign: AbstractChartAxesDesign = {};
  for (const [key, value] of Object.entries(axesDesign)) {
    newAxesDesign[key] = copyChartTitleReferenceWithNewSheetId(sheetIdFrom, sheetIdTo, value);
  }
  return newAxesDesign;
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
 * Transform a chart definition containing dataSets, labelRange, chartTitleRange,
 * and axisTitleRange using a executed command.
 */
export function transformChartDefinitionWithDataSetsWithZone<T extends ChartWithAxisDefinition>(
  definition: T,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): T {
  // Label range transformation
  let labelRange: string | undefined;
  if (definition.labelRange) {
    const labelZone = transformZone(toUnboundedZone(definition.labelRange), executed);
    labelRange = labelZone ? zoneToXc(labelZone) : undefined;
  }

  // DataSets transformation
  const dataSets: CustomizedDataSet[] = definition.dataSets
    .map((ds) => toUnboundedZone(ds.dataRange))
    .map((zone) => transformZone(zone, executed))
    .filter(isDefined)
    .map((xc) => ({ dataRange: zoneToXc(xc) }));

  // Chart title transformation
  let chartTitle: string = definition.title.text;
  if (definition.title.type === "reference" && definition.title.text) {
    const titleZone = transformZone(toUnboundedZone(definition.title.text), executed);
    chartTitle = titleZone ? zoneToXc(titleZone) : "";
  }

  // Axis title transformation
  let updatedAxesDesign: AxesDesign | undefined = undefined;
  if (definition.axesDesign) {
    updatedAxesDesign = {};
    for (const [key, value] of Object.entries(definition.axesDesign)) {
      if (value.type === "reference" && value.text) {
        const titleZone = transformZone(toUnboundedZone(value.text), executed);
        updatedAxesDesign[key] = titleZone ? { ...value, text: zoneToXc(titleZone) } : value;
      } else {
        updatedAxesDesign[key] = value;
      }
    }
  }

  return {
    ...definition,
    title: {
      ...definition.title,
      text: chartTitle,
    },
    labelRange,
    dataSets,
    axesDesign: updatedAxesDesign,
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

export function checkChartTitle(definition: ChartDefinition): CommandResult {
  if (definition.title.type === "reference" && definition.title.text) {
    const invalidTitle = !rangeReference.test(definition.title.text);
    if (invalidTitle) {
      return CommandResult.InvalidTitleRange;
    }
  }
  return CommandResult.Success;
}

export function checkAxesDesign(definition: ChartWithAxisDefinition): CommandResult {
  if (definition.axesDesign) {
    for (const value of Object.values(definition.axesDesign)) {
      if (value.type === "reference" && value.text) {
        const invalidTitle = !rangeReference.test(value.text);
        if (invalidTitle) {
          return CommandResult.InvalidTitleRange;
        }
      }
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

export function getChartAxisTitleRuntime(
  getters: Getters,
  title?: AbstractChartTitle
): ChartAxisTitleRuntime {
  if (!title) {
    return;
  }

  const axisDesign = getChartRuntimeTitle(getters, title);
  const { text, design } = axisDesign;

  if (!text) {
    return;
  }

  return {
    display: true,
    text,
    color: design?.color,
    font: {
      style: design?.italic ? "italic" : "normal",
      weight: design?.bold ? "bold" : "normal",
    },
    align: design?.align === "left" ? "start" : design?.align === "right" ? "end" : "center",
  };
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

/**
 * Retrieves AbstractChart AxesDesign, converting range strings to valid range objects.
 */
export function getAxesDesignWithValidRanges(
  getters: CoreGetters,
  sheetId: UID,
  axesDesign?: AxesDesign
): AbstractChartAxesDesign | undefined {
  if (!axesDesign) {
    return undefined;
  }

  const newAxesDesign: AbstractChartAxesDesign = {};
  for (const [key, value] of Object.entries(axesDesign)) {
    newAxesDesign[key] = getChartTitleWithValidRange(getters, sheetId, value);
  }
  return newAxesDesign;
}

/**
 * Retrieves AbstractChart Title, converting range strings to valid range objects.
 */
export function getChartTitleWithValidRange(
  getters: CoreGetters,
  sheetId: UID,
  title: Title
): AbstractChartTitle {
  if (title.type === "reference") {
    return {
      ...title,
      reference: createValidRange(getters, sheetId, title.text),
    };
  } else {
    return {
      ...title,
      value: title.text,
    };
  }
}

/**
 * Retrieves a title by converting a range object to a range string.
 */
export function getChartTitleWithRangeString(
  getters: CoreGetters,
  sheetId: UID,
  title: AbstractChartTitle
): Title {
  const { type, design } = title;

  const titleText =
    type === "reference"
      ? (title.reference && getters.getRangeString(title.reference, sheetId)) ?? ""
      : title.value;

  return {
    type,
    text: titleText,
    design,
  };
}

/**
 * Retrieves a chart axes design by converting range objects to range strings.
 */
export function getAxesDesignWithRangeString(
  getters: CoreGetters,
  sheetId: UID,
  axesDesign?: AbstractChartAxesDesign
): AxesDesign | undefined {
  if (!axesDesign) {
    return undefined;
  }

  const newAxesDesign: AxesDesign = {};
  for (const [key, value] of Object.entries(axesDesign)) {
    newAxesDesign[key] = getChartTitleWithRangeString(getters, sheetId, value);
  }
  return newAxesDesign;
}

/**
 * Checks if a range is fully contained within a merge zone.
 */
export function isRangeInsideMerge(range: Zone, merge: Zone): boolean {
  return (
    range.top >= merge.top &&
    range.left >= merge.left &&
    range.bottom <= merge.bottom &&
    range.right <= merge.right
  );
}

/**
 * Retrieves the title for a chart from its definition.
 * If the title is a cell reference, this function returns the formatted value of the referenced cell.
 * If the title is provided as a direct value, it returns the title as is.
 */
export function getChartRuntimeTitle(getters: Getters, title: AbstractChartTitle): Title {
  const { type, design } = title;

  if (type === "string") {
    return {
      type,
      text: title.value,
      design,
    };
  }

  const { reference } = title;
  if (!reference?.zone) {
    return {
      type,
      text: "",
      design,
    };
  }

  const { sheetId } = reference;
  const range = reference.zone;
  for (const merge of getters.getMerges(sheetId)) {
    if (isRangeInsideMerge(range, merge)) {
      return {
        text: getters.getCellText({ sheetId, row: merge.top, col: merge.left }),
        type,
        design,
      };
    }
  }

  return {
    text: getters.getCellText({ sheetId, row: range.top, col: range.left }),
    type,
    design,
  };
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
  data: number[]
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
    xAxisID: TREND_LINE_XAXIS_ID,
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
): number[] {
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
    default:
      return [];
  }
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
