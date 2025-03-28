import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CellPosition,
  ChangeType,
  Command,
  CoreGetters,
  CustomizedDataSet,
  DeleteSheetCommand,
  Getters,
  MoveRangeCommand,
  Range,
  RangeAdapter,
  RangePart,
  RangeStringOptions,
  RemoveColumnsRowsCommand,
  RenameSheetCommand,
  UID,
  UnboundedZone,
  ZoneDimension,
} from "../types";
import { CellErrorType } from "../types/errors";
import { numberToLetters } from "./coordinates";
import { getCanonicalSymbolName, groupConsecutive, largeMax, largeMin } from "./misc";
import { isRowReference, splitReference } from "./references";
import {
  boundUnboundedZone,
  createAdaptedZone,
  getZoneArea,
  isFullCol,
  isFullRow,
  isZoneInside,
  isZoneOrdered,
  positions,
  toUnboundedZone,
  zoneToXc,
} from "./zones";

interface RangeArgs {
  zone: Readonly<UnboundedZone>;
  parts: readonly RangePart[];
  invalidXc?: string;
  /** true if the user provided the range with the sheet name */
  prefixSheet: boolean;
  /** the name of any sheet that is invalid */
  invalidSheetName?: string;
  /** the sheet on which the range is defined */
  sheetId: UID;
}

export function createRange(args: RangeArgs, getSheetSize: (sheetId: UID) => ZoneDimension): Range {
  const unboundedZone = args.zone;
  const zone = boundUnboundedZone(unboundedZone, getSheetSize(args.sheetId));
  let parts = args.parts;
  if (args.parts.length === 1 && getZoneArea(zone) > 1) {
    parts = [args.parts[0], args.parts[0]];
  } else if (args.parts.length === 2 && getZoneArea(zone) === 1) {
    parts = [args.parts[0]];
  }
  return {
    unboundedZone,
    zone,
    parts,
    invalidXc: args.invalidXc,
    prefixSheet: args.prefixSheet,
    invalidSheetName: args.invalidSheetName,
    sheetId: args.sheetId,
  };
}

export function createInvalidRange(sheetXC: string): Range {
  const invalidZone = { left: -1, top: -1, right: -1, bottom: -1 };
  return {
    sheetId: "",
    zone: invalidZone,
    unboundedZone: invalidZone,
    parts: [],
    invalidXc: sheetXC,
    prefixSheet: false,
  };
}

export function isFullColRange(range: Range): boolean {
  return isFullCol(range.unboundedZone);
}

export function isFullRowRange(range: Range): boolean {
  return isFullRow(range.unboundedZone);
}

export function getRangeString(
  range: Range,
  forSheetId: UID,
  getSheetName: (sheetId: UID) => string,
  options: RangeStringOptions = { useBoundedReference: false, useFixedReference: false }
): string {
  if (range.invalidXc) {
    return range.invalidXc;
  }
  if (range.zone.bottom - range.zone.top < 0 || range.zone.right - range.zone.left < 0) {
    return CellErrorType.InvalidReference;
  }
  if (range.zone.left < 0 || range.zone.top < 0) {
    return CellErrorType.InvalidReference;
  }
  let prefixSheet = range.sheetId !== forSheetId || range.invalidSheetName || range.prefixSheet;
  let sheetName: string = "";
  if (prefixSheet) {
    if (range.invalidSheetName) {
      sheetName = range.invalidSheetName;
    } else {
      sheetName = getCanonicalSymbolName(getSheetName(range.sheetId));
    }
  }

  if (prefixSheet && !sheetName) {
    return CellErrorType.InvalidReference;
  }

  let rangeString = getRangePartString(range, 0, options);
  if (range.parts && range.parts.length === 2) {
    // range if converts A2:A2 into A2 except if any part of the original range had fixed row or column (with $)
    if (
      range.zone.top !== range.zone.bottom ||
      range.zone.left !== range.zone.right ||
      range.parts[0].rowFixed ||
      range.parts[0].colFixed ||
      range.parts[1].rowFixed ||
      range.parts[1].colFixed
    ) {
      rangeString += ":";
      rangeString += getRangePartString(range, 1, options);
    }
  }

  return `${prefixSheet ? sheetName + "!" : ""}${rangeString}`;
}

/**
 * Duplicate a range. If the range is on the sheetIdFrom, the range will target
 * sheetIdTo.
 */
export function duplicateRangeInDuplicatedSheet(
  sheetIdFrom: UID,
  sheetIdTo: UID,
  range: Range
): Range {
  const sheetId = range.sheetId === sheetIdFrom ? sheetIdTo : range.sheetId;
  return { ...range, sheetId };
}

/**
 * Create a range from a xc. If the xc is empty, this function returns undefined.
 */
export function createValidRange(
  getters: CoreGetters,
  sheetId: UID,
  xc?: string
): Range | undefined {
  if (!xc) return;
  const range = getters.getRangeFromSheetXC(sheetId, xc);
  return !(range.invalidSheetName || range.invalidXc) ? range : undefined;
}

/**
 * Spread multiple colrows zone to one row/col zone and add a many new input range as needed.
 * For example, A1:B4 will become [A1:A4, B1:B4]
 */
export function spreadRange(getters: Getters, dataSets: CustomizedDataSet[]): CustomizedDataSet[] {
  const postProcessedRanges: CustomizedDataSet[] = [];
  for (const dataSet of dataSets) {
    const range = dataSet.dataRange;
    if (!getters.isRangeValid(range)) {
      postProcessedRanges.push(dataSet); // ignore invalid range
      continue;
    }

    const { sheetName } = splitReference(range);
    const sheetPrefix = sheetName ? `${sheetName}!` : "";
    const zone = toUnboundedZone(range);
    if (zone.bottom !== zone.top && zone.left != zone.right) {
      if (zone.right) {
        for (let j = zone.left; j <= zone.right; ++j) {
          const datasetOptions = j === zone.left ? dataSet : { yAxisId: dataSet.yAxisId };
          postProcessedRanges.push({
            ...datasetOptions,
            dataRange: `${sheetPrefix}${zoneToXc({
              left: j,
              right: j,
              top: zone.top,
              bottom: zone.bottom,
            })}`,
          });
        }
      } else {
        for (let j = zone.top; j <= zone.bottom!; ++j) {
          const datasetOptions = j === zone.top ? dataSet : { yAxisId: dataSet.yAxisId };
          postProcessedRanges.push({
            ...datasetOptions,
            dataRange: `${sheetPrefix}${zoneToXc({
              left: zone.left,
              right: zone.right,
              top: j,
              bottom: j,
            })}`,
          });
        }
      }
    } else {
      postProcessedRanges.push(dataSet);
    }
  }
  return postProcessedRanges;
}

/**
 * Get all the cell positions in the given ranges. If a cell is in multiple ranges, it will be returned multiple times.
 */
export function getCellPositionsInRanges(ranges: Range[]): CellPosition[] {
  const cellPositions: CellPosition[] = [];
  for (const range of ranges) {
    for (const position of positions(range.zone)) {
      cellPositions.push({ ...position, sheetId: range.sheetId });
    }
  }
  return cellPositions;
}

export function getRangeParts(xc: string, zone: UnboundedZone): RangePart[] {
  const parts = xc.split(":").map((p) => {
    const isFullRow = isRowReference(p);
    return {
      colFixed: isFullRow ? false : p.startsWith("$"),
      rowFixed: isFullRow ? p.startsWith("$") : p.includes("$", 1),
    };
  });

  const isFullCol = zone.bottom === undefined;
  const isFullRow = zone.right === undefined;
  if (isFullCol) {
    parts[0].rowFixed = parts[0].rowFixed || parts[1].rowFixed;
    parts[1].rowFixed = parts[0].rowFixed || parts[1].rowFixed;
  }
  if (isFullRow) {
    parts[0].colFixed = parts[0].colFixed || parts[1].colFixed;
    parts[1].colFixed = parts[0].colFixed || parts[1].colFixed;
  }

  return parts;
}

/**
 * Check that a zone is valid regarding the order of top-bottom and left-right.
 * Left should be smaller than right, top should be smaller than bottom.
 * If it's not the case, simply invert them, and invert the linked parts
 */
export function orderRange(range: Range): Range {
  if (isZoneOrdered(range.zone)) {
    return range;
  }
  const unboundedZone = { ...range.unboundedZone };
  const zone = { ...range.zone };
  let parts = range.parts;
  if (unboundedZone.right !== undefined && unboundedZone.right < unboundedZone.left) {
    let right = unboundedZone.right;
    unboundedZone.right = unboundedZone.left;
    unboundedZone.left = right;
    zone.right = zone.left;
    zone.left = right;
    parts = [
      {
        colFixed: parts[1]?.colFixed || false,
        rowFixed: parts[0]?.rowFixed || false,
      },
      {
        colFixed: parts[0]?.colFixed || false,
        rowFixed: parts[1]?.rowFixed || false,
      },
    ];
  }

  if (unboundedZone.bottom !== undefined && unboundedZone.bottom < unboundedZone.top) {
    let bottom = unboundedZone.bottom;
    unboundedZone.bottom = unboundedZone.top;
    unboundedZone.top = bottom;
    zone.bottom = zone.top;
    zone.top = bottom;
    parts = [
      {
        colFixed: parts[0]?.colFixed || false,
        rowFixed: parts[1]?.rowFixed || false,
      },
      {
        colFixed: parts[1]?.colFixed || false,
        rowFixed: parts[0]?.rowFixed || false,
      },
    ];
  }
  return {
    unboundedZone,
    zone,
    parts,
    invalidXc: range.invalidXc,
    prefixSheet: range.prefixSheet,
    invalidSheetName: range.invalidSheetName,
    sheetId: range.sheetId,
  };
}

export function getRangeAdapter(cmd: Command): RangeAdapter | undefined {
  switch (cmd.type) {
    case "REMOVE_COLUMNS_ROWS":
      return {
        applyChange: getApplyRangeChangeRemoveColRow(cmd),
        sheetId: cmd.sheetId,
        sheetName: cmd.sheetName,
      };
    case "ADD_COLUMNS_ROWS":
      return {
        applyChange: getApplyRangeChangeAddColRow(cmd),
        sheetId: cmd.sheetId,
        sheetName: cmd.sheetName,
      };
    case "DELETE_SHEET":
      return {
        applyChange: getApplyRangeChangeDeleteSheet(cmd),
        sheetId: cmd.sheetId,
        sheetName: cmd.sheetName,
      };
    case "RENAME_SHEET":
      return {
        applyChange: getApplyRangeChangeRenameSheet(cmd),
        sheetId: cmd.sheetId,
        sheetName: cmd.oldName,
      };
    case "MOVE_RANGES":
      return {
        applyChange: getApplyRangeChangeMoveRange(cmd),
        sheetId: cmd.sheetId,
        sheetName: cmd.sheetName,
      };
  }
  return undefined;
}

function getApplyRangeChangeRemoveColRow(cmd: RemoveColumnsRowsCommand): ApplyRangeChange {
  let start: "left" | "top" = cmd.dimension === "COL" ? "left" : "top";
  let end: "right" | "bottom" = cmd.dimension === "COL" ? "right" : "bottom";
  let dimension: "columns" | "rows" = cmd.dimension === "COL" ? "columns" : "rows";

  const elements = [...cmd.elements];
  elements.sort((a, b) => b - a);

  const groups = groupConsecutive(elements);
  return (range: Range) => {
    if (range.sheetId !== cmd.sheetId) {
      return { changeType: "NONE" };
    }
    let newRange = range;
    let changeType: ChangeType = "NONE";
    for (let group of groups) {
      const min = largeMin(group);
      const max = largeMax(group);
      if (range.zone[start] <= min && min <= range.zone[end]) {
        const toRemove = Math.min(range.zone[end], max) - min + 1;
        changeType = "RESIZE";
        newRange = createAdaptedRange(newRange, dimension, changeType, -toRemove);
      } else if (range.zone[start] >= min && range.zone[end] <= max) {
        changeType = "REMOVE";
        newRange = createInvalidRange(CellErrorType.InvalidReference);
      } else if (range.zone[start] <= max && range.zone[end] >= max) {
        const toRemove = max - range.zone[start] + 1;
        changeType = "RESIZE";
        newRange = createAdaptedRange(newRange, dimension, changeType, -toRemove);
        newRange = createAdaptedRange(newRange, dimension, "MOVE", -(range.zone[start] - min));
      } else if (min < range.zone[start]) {
        changeType = "MOVE";
        newRange = createAdaptedRange(newRange, dimension, changeType, -(max - min + 1));
      }
    }
    if (changeType !== "NONE") {
      return { changeType, range: newRange };
    }
    return { changeType: "NONE" };
  };
}

function getApplyRangeChangeAddColRow(cmd: AddColumnsRowsCommand): ApplyRangeChange {
  let start: "left" | "top" = cmd.dimension === "COL" ? "left" : "top";
  let end: "right" | "bottom" = cmd.dimension === "COL" ? "right" : "bottom";
  let dimension: "columns" | "rows" = cmd.dimension === "COL" ? "columns" : "rows";

  return (range: Range) => {
    if (range.sheetId !== cmd.sheetId) {
      return { changeType: "NONE" };
    }
    if (cmd.position === "after") {
      if (range.zone[start] <= cmd.base && cmd.base < range.zone[end]) {
        return {
          changeType: "RESIZE",
          range: createAdaptedRange(range, dimension, "RESIZE", cmd.quantity),
        };
      }
      if (cmd.base < range.zone[start]) {
        return {
          changeType: "MOVE",
          range: createAdaptedRange(range, dimension, "MOVE", cmd.quantity),
        };
      }
    } else {
      if (range.zone[start] < cmd.base && cmd.base <= range.zone[end]) {
        return {
          changeType: "RESIZE",
          range: createAdaptedRange(range, dimension, "RESIZE", cmd.quantity),
        };
      }
      if (cmd.base <= range.zone[start]) {
        return {
          changeType: "MOVE",
          range: createAdaptedRange(range, dimension, "MOVE", cmd.quantity),
        };
      }
    }
    return { changeType: "NONE" };
  };
}

function getApplyRangeChangeDeleteSheet(cmd: DeleteSheetCommand): ApplyRangeChange {
  return (range: Range) => {
    if (range.sheetId !== cmd.sheetId && range.invalidSheetName !== cmd.sheetName) {
      return { changeType: "NONE" };
    }
    const invalidSheetName = cmd.sheetName;
    range = {
      ...createInvalidRange(CellErrorType.InvalidReference),
      invalidSheetName,
    };
    return { changeType: "REMOVE", range };
  };
}

function getApplyRangeChangeRenameSheet(cmd: RenameSheetCommand): ApplyRangeChange {
  return (range: Range) => {
    if (range.sheetId === cmd.sheetId) {
      return { changeType: "CHANGE", range };
    }
    if (cmd.newName && range.invalidSheetName === cmd.newName) {
      const invalidSheetName = undefined;
      const sheetId = cmd.sheetId;
      const newRange = { ...range, sheetId, invalidSheetName };
      return { changeType: "CHANGE", range: newRange };
    }
    if (cmd.oldName && range.invalidSheetName === cmd.oldName) {
      const invalidSheetName = undefined;
      const sheetId = cmd.sheetId;
      const newRange = { ...range, sheetId, invalidSheetName };
      return { changeType: "CHANGE", range: newRange };
    }
    return { changeType: "NONE" };
  };
}

function getApplyRangeChangeMoveRange(cmd: MoveRangeCommand): ApplyRangeChange {
  const originZone = cmd.target[0];
  return (range: Range) => {
    if (range.sheetId !== cmd.sheetId || !isZoneInside(range.zone, originZone)) {
      return { changeType: "NONE" };
    }
    const targetSheetId = cmd.targetSheetId;
    const offsetX = cmd.col - originZone.left;
    const offsetY = cmd.row - originZone.top;
    const adaptedRange = createAdaptedRange(range, "both", "MOVE", [offsetX, offsetY]);
    const prefixSheet = cmd.sheetId === targetSheetId ? adaptedRange.prefixSheet : true;
    return {
      changeType: "MOVE",
      range: { ...adaptedRange, sheetId: targetSheetId, prefixSheet },
    };
  };
}

function createAdaptedRange<Dimension extends "columns" | "rows" | "both">(
  range: Range,
  dimension: Dimension,
  operation: "MOVE" | "RESIZE",
  by: Dimension extends "both" ? [number, number] : number
) {
  return {
    ...range,
    unboundedZone: createAdaptedZone(range.unboundedZone, dimension, operation, by),
    zone: createAdaptedZone(range.zone, dimension, operation, by),
  };
}

function getRangePartString(
  range: Range,
  part: 0 | 1,
  options: RangeStringOptions = { useBoundedReference: false, useFixedReference: false }
): string {
  const colFixed = range.parts[part]?.colFixed || options.useFixedReference ? "$" : "";
  const col = part === 0 ? numberToLetters(range.zone.left) : numberToLetters(range.zone.right);
  const rowFixed = range.parts[part]?.rowFixed || options.useFixedReference ? "$" : "";
  const row = part === 0 ? String(range.zone.top + 1) : String(range.zone.bottom + 1);

  let str = "";
  if (isFullCol(range.unboundedZone) && !options.useBoundedReference) {
    if (part === 0 && range.unboundedZone.hasHeader) {
      str = colFixed + col + rowFixed + row;
    } else {
      str = colFixed + col;
    }
  } else if (isFullRow(range.unboundedZone) && !options.useBoundedReference) {
    if (part === 0 && range.unboundedZone.hasHeader) {
      str = colFixed + col + rowFixed + row;
    } else {
      str = rowFixed + row;
    }
  } else {
    str = colFixed + col + rowFixed + row;
  }

  return str;
}
