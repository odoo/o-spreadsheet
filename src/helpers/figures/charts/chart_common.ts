import { transformZone } from "../../../collaborative/ot/ot_helpers";
import { INCORRECT_RANGE_STRING } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CellValueType,
  Color,
  CommandResult,
  CoreGetters,
  DOMCoordinates,
  DOMDimension,
  EvaluatedCell,
  Getters,
  Locale,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  UnboundedZone,
  Zone,
} from "../../../types";
import { BarChartDefinition } from "../../../types/chart/bar_chart";
import { DataSet, ExcelChartDataset } from "../../../types/chart/chart";
import { LineChartDefinition } from "../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../types/chart/pie_chart";
import { BaselineArrowDirection, BaselineMode } from "../../../types/chart/scorecard_chart";
import { relativeLuminance } from "../../color";
import { formatValue } from "../../format";
import { isDefined } from "../../misc";
import { copyRangeWithNewSheetId } from "../../range";
import { rangeReference } from "../../references";
import { getZoneArea, isFullRow, toUnboundedZone, zoneToDimension, zoneToXc } from "../../zones";

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
      getters.getRangeString(dataRange, dataRange.sheetId) === INCORRECT_RANGE_STRING
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
  dataSetsString: string[],
  sheetId: UID,
  dataSetsHaveTitle: boolean
): DataSet[] {
  const dataSets: DataSet[] = [];
  for (const sheetXC of dataSetsString) {
    const dataRange = getters.getRangeFromSheetXC(sheetId, sheetXC);
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
        dataSets.push(
          createDataSet(
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
          )
        );
      }
    } else if (zone.left === zone.right && zone.top === zone.bottom) {
      // A single cell. If it's only the title, the dataset is not added.
      if (!dataSetsHaveTitle) {
        dataSets.push(createDataSet(getters, dataSetSheetId, zone, undefined));
      }
    } else {
      /* 1 row or 1 column */
      dataSets.push(
        createDataSet(
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
        )
      );
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

  return {
    label: ds.labelCell ? getters.getRangeString(ds.labelCell, "forceSheetReference") : undefined,
    range: getters.getRangeString(dataRange, "forceSheetReference"),
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
  return getters.getRangeString(range, "forceSheetReference");
}

/**
 * Transform a chart definition which supports dataSets (dataSets and LabelRange)
 * with an executed command
 */
export function transformChartDefinitionWithDataSetsWithZone<
  T extends LineChartDefinition | BarChartDefinition | PieChartDefinition
>(definition: T, executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand): T {
  let labelRange: string | undefined;
  if (definition.labelRange) {
    const labelZone = transformZone(toUnboundedZone(definition.labelRange), executed);
    labelRange = labelZone ? zoneToXc(labelZone) : undefined;
  }
  const dataSets = definition.dataSets
    .map(toUnboundedZone)
    .map((zone) => transformZone(zone, executed))
    .filter(isDefined)
    .map(zoneToXc);
  return {
    ...definition,
    labelRange,
    dataSets,
  };
}

const GraphColors = [
  // the same colors as those used in odoo reporting
  "rgb(31,119,180)",
  "rgb(255,127,14)",
  "rgb(174,199,232)",
  "rgb(255,187,120)",
  "rgb(44,160,44)",
  "rgb(152,223,138)",
  "rgb(214,39,40)",
  "rgb(255,152,150)",
  "rgb(148,103,189)",
  "rgb(197,176,213)",
  "rgb(140,86,75)",
  "rgb(196,156,148)",
  "rgb(227,119,194)",
  "rgb(247,182,210)",
  "rgb(127,127,127)",
  "rgb(199,199,199)",
  "rgb(188,189,34)",
  "rgb(219,219,141)",
  "rgb(23,190,207)",
  "rgb(158,218,229)",
];

export class ChartColors {
  private graphColorIndex = 0;

  next(): string {
    return GraphColors[this.graphColorIndex++ % GraphColors.length];
  }
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

export function checkDataset(
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition
): CommandResult {
  if (definition.dataSets) {
    const invalidRanges =
      definition.dataSets.find((range) => !rangeReference.test(range)) !== undefined;
    if (invalidRanges) {
      return CommandResult.InvalidDataSet;
    }
    const zones = definition.dataSets.map(toUnboundedZone);
    if (zones.some((zone) => zone.top !== zone.bottom && isFullRow(zone))) {
      return CommandResult.InvalidDataSet;
    }
  }
  return CommandResult.Success;
}

export function checkLabelRange(
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition
): CommandResult {
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

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

export function getBaselineText(
  baseline: EvaluatedCell | undefined,
  keyValue: EvaluatedCell | undefined,
  baselineMode: BaselineMode,
  locale: Locale
): string {
  if (!baseline) {
    return "";
  } else if (
    baselineMode === "text" ||
    keyValue?.type !== CellValueType.number ||
    baseline.type !== CellValueType.number
  ) {
    return baseline.formattedValue;
  } else {
    let diff = keyValue.value - baseline.value;
    if (baselineMode === "percentage" && diff !== 0) {
      diff = (diff / baseline.value) * 100;
    }

    if (baselineMode !== "percentage" && baseline.format) {
      return formatValue(diff, { format: baseline.format, locale });
    }

    const baselineStr = Math.abs(parseFloat(diff.toFixed(2))).toLocaleString();
    return baselineMode === "percentage" ? baselineStr + "%" : baselineStr;
  }
}

export function getBaselineColor(
  baseline: EvaluatedCell | undefined,
  baselineMode: BaselineMode,
  keyValue: EvaluatedCell | undefined,
  colorUp: Color,
  colorDown: Color
): Color | undefined {
  if (
    baselineMode === "text" ||
    baseline?.type !== CellValueType.number ||
    keyValue?.type !== CellValueType.number
  ) {
    return undefined;
  }
  const diff = keyValue.value - baseline.value;
  if (diff > 0) {
    return colorUp;
  } else if (diff < 0) {
    return colorDown;
  }
  return undefined;
}

export function getBaselineArrowDirection(
  baseline: EvaluatedCell | undefined,
  keyValue: EvaluatedCell | undefined,
  baselineMode: BaselineMode
): BaselineArrowDirection {
  if (
    baselineMode === "text" ||
    baseline?.type !== CellValueType.number ||
    keyValue?.type !== CellValueType.number
  ) {
    return "neutral";
  }

  const diff = keyValue.value - baseline.value;
  if (diff > 0) {
    return "up";
  } else if (diff < 0) {
    return "down";
  }
  return "neutral";
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
