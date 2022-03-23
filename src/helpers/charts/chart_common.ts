import { transformZone } from "../../collaborative/ot/ot_helpers";
import { INCORRECT_RANGE_STRING } from "../../constants";
import { toNumber } from "../../functions/helpers";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
  Zone,
} from "../../types";
import { BarChartDefinition } from "../../types/chart/bar_chart";
import { DataSet, ExcelChartDataset } from "../../types/chart/chart";
import { LineChartDefinition } from "../../types/chart/line_chart";
import { PieChartDefinition } from "../../types/chart/pie_chart";
import { BaselineArrowDirection } from "../../types/chart/scorecard_chart";
import { relativeLuminance } from "../color";
import { isDefined } from "../misc";
import { isNumber } from "../numbers";
import { copyRangeWithNewSheetId } from "../range";
import { rangeReference } from "../references";
import { toZone, zoneToDimension, zoneToXc } from "../zones";

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
    const { zone, sheetId: dataSetSheetId, invalidSheetName } = dataRange;
    if (invalidSheetName) {
      continue;
    }
    if (zone.left !== zone.right && zone.top !== zone.bottom) {
      // It's a rectangle. We treat all columns (arbitrary) as different data series.
      for (let column = zone.left; column <= zone.right; column++) {
        const columnZone = {
          left: column,
          right: column,
          top: zone.top,
          bottom: zone.bottom,
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
  fullZone: Zone,
  titleZone: Zone | undefined
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
    const { height, width } = zoneToDimension(dataZone);
    if (height === 1) {
      dataZone = { ...dataZone, left: dataZone.left + 1 };
    } else if (width === 1) {
      dataZone = { ...dataZone, top: dataZone.top + 1 };
    }
  }

  const dataRange = {
    ...ds.dataRange,
    zone: dataZone,
  };

  return {
    label: ds.labelCell ? getters.getRangeString(ds.labelCell, "forceSheetReference") : undefined,
    range: getters.getRangeString(dataRange, "forceSheetReference"),
  };
}

/**
 * Transform a chart definition which supports dataSets (dataSets and LabelRange)
 * with an executed command
 */
export function transformChartDefinitionWithDataSetsWithZone<
  T extends LineChartDefinition | BarChartDefinition | PieChartDefinition
>(definition: T, executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand): T {
  let labelZone: Zone | undefined;
  if (definition.labelRange) {
    labelZone = transformZone(toZone(definition.labelRange), executed);
  }
  const dataSets = definition.dataSets
    .map(toZone)
    .map((zone) => transformZone(zone, executed))
    .filter(isDefined)
    .map(zoneToXc);
  return {
    ...definition,
    labelRange: labelZone ? zoneToXc(labelZone) : undefined,
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

export function checkDatasetNotEmpty(
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition
): CommandResult {
  return definition.dataSets && definition.dataSets.length === 0
    ? CommandResult.EmptyDataSet
    : CommandResult.Success;
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

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

export function getBaselineText(
  baseline: string | undefined,
  keyValue: string,
  baselineMode: "absolute" | "percentage"
): string | undefined {
  let baselineValue: string | undefined = undefined;
  if (!baseline) {
    baselineValue = undefined;
  } else if (!isNumber(baseline) || !isNumber(keyValue)) {
    baselineValue = baseline.toString();
  } else {
    let diff = toNumber(keyValue) - toNumber(baseline);
    if (baselineMode === "percentage") {
      diff = (diff / toNumber(baseline)) * 100;
    }
    baselineValue = Math.abs(parseFloat(diff.toFixed(2))).toLocaleString();
    if (baselineMode === "percentage") {
      baselineValue += "%";
    }
  }

  return baselineValue;
}

export function getBaselineColor(
  baseline: string | undefined,
  keyValue: string,
  colorUp: string,
  colorDown: string
): string | undefined {
  if (!isNumber(baseline) || !isNumber(keyValue)) {
    return undefined;
  }
  const diff = toNumber(keyValue) - toNumber(baseline);
  if (diff > 0) {
    return colorUp;
  } else if (diff < 0) {
    return colorDown;
  }
  return undefined;
}

export function getBaselineArrowDirection(
  baseline: string | undefined,
  keyValue: string
): BaselineArrowDirection {
  if (!isNumber(baseline) || !isNumber(keyValue)) {
    return "neutral";
  }

  const diff = toNumber(keyValue) - toNumber(baseline);
  if (diff > 0) {
    return "up";
  } else if (diff < 0) {
    return "down";
  }
  return "neutral";
}
