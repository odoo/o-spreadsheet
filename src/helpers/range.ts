import { RangeStringOptions } from "../plugins/core";
import { _t } from "../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  ApplyRangeChangeSheet,
  CellPosition,
  ChangeType,
  Command,
  CoreGetters,
  CustomizedDataSet,
  DeleteSheetCommand,
  Getters,
  MoveRangeCommand,
  Range,
  RangeData,
  RangePart,
  RemoveColumnsRowsCommand,
  RenameSheetCommand,
  UID,
  UnboundedZone,
  Zone,
  ZoneDimension,
} from "../types";
import { CellErrorType } from "../types/errors";
import { numberToLetters } from "./coordinates";
import { getCanonicalSymbolName, groupConsecutive, largeMax, largeMin } from "./misc";
import { isRowReference, splitReference } from "./references";
import {
  createAdaptedZone,
  getZoneArea,
  isZoneInside,
  isZoneOrdered,
  positions,
  toUnboundedZone,
  zoneToXc,
} from "./zones";

interface ConstructorArgs {
  readonly unboundedZone: Readonly<UnboundedZone>;
  readonly parts: readonly RangePart[];
  readonly invalidXc?: string;
  /** true if the user provided the range with the sheet name */
  readonly prefixSheet: boolean;
  /** the name of any sheet that is invalid */
  readonly invalidSheetName?: string;
  /** the sheet on which the range is defined */
  readonly sheetId: UID;
}

export class RangeImpl implements Range {
  private readonly _zone: Readonly<Zone | UnboundedZone>;
  readonly parts: Range["parts"];
  readonly invalidXc?: string;
  readonly prefixSheet: boolean = false;
  readonly sheetId: UID; // the sheet on which the range is defined
  readonly invalidSheetName?: string; // the name of any sheet that is invalid
  private getSheetSize: (sheetId: UID) => ZoneDimension;

  constructor(args: ConstructorArgs, getSheetSize?: (sheetId: UID) => ZoneDimension) {
    this._zone = args.unboundedZone;

    this.prefixSheet = args.prefixSheet;
    this.invalidXc = args.invalidXc;

    this.sheetId = args.sheetId;
    this.invalidSheetName = args.invalidSheetName;

    if (getSheetSize) {
      this.getSheetSize = getSheetSize;
    } else {
      this.getSheetSize = (sheetId: UID) => {
        return { numberOfRows: Number.MAX_SAFE_INTEGER, numberOfCols: Number.MAX_SAFE_INTEGER };
      };
    }
    let _fixedParts = [...args.parts];
    if (args.parts.length === 1 && getZoneArea(this.zone) > 1) {
      _fixedParts.push({ ...args.parts[0] });
    } else if (args.parts.length === 2 && getZoneArea(this.zone) === 1) {
      _fixedParts.pop();
    }
    this.parts = _fixedParts;
  }

  static fromRange(range: Range, getSheetSize: (sheetId: UID) => ZoneDimension): RangeImpl {
    if (range instanceof RangeImpl) {
      return range;
    }
    return new RangeImpl(range, getSheetSize);
  }

  get unboundedZone(): UnboundedZone {
    return this._zone;
  }

  get zone(): Readonly<Zone> {
    const { left, top, bottom, right } = this._zone;
    if (right !== undefined && bottom !== undefined) {
      return this._zone as Readonly<Zone>;
    } else if (bottom === undefined && right !== undefined) {
      return { right, top, left, bottom: this.getSheetSize(this.sheetId).numberOfRows - 1 };
    } else if (right === undefined && bottom !== undefined) {
      return { bottom, left, top, right: this.getSheetSize(this.sheetId).numberOfCols - 1 };
    }
    throw new Error(_t("Bad zone format"));
  }

  static getRangeParts(xc: string, zone: UnboundedZone): RangePart[] {
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

  get isFullCol(): boolean {
    return this._zone.bottom === undefined;
  }

  get isFullRow(): boolean {
    return this._zone.right === undefined;
  }

  get rangeData(): RangeData {
    return {
      _zone: this._zone,
      _sheetId: this.sheetId,
    };
  }

  /**
   * Check that a zone is valid regarding the order of top-bottom and left-right.
   * Left should be smaller than right, top should be smaller than bottom.
   * If it's not the case, simply invert them, and invert the linked parts
   */
  orderZone(): RangeImpl {
    if (isZoneOrdered(this._zone)) {
      return this;
    }
    const zone = { ...this._zone };
    let parts = this.parts;
    if (zone.right !== undefined && zone.right < zone.left) {
      let right = zone.right;
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

    if (zone.bottom !== undefined && zone.bottom < zone.top) {
      let bottom = zone.bottom;
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
    return this.clone({ unboundedZone: zone, parts });
  }

  /**
   *
   * @param rangeParams optional, values to put in the cloned range instead of the current values of the range
   */
  clone(rangeParams?: Partial<Range>): RangeImpl {
    const unboundedZone = rangeParams?.unboundedZone ?? rangeParams?.zone;
    return new RangeImpl(
      {
        unboundedZone: unboundedZone || { ...this._zone },
        sheetId: rangeParams?.sheetId ? rangeParams.sheetId : this.sheetId,
        invalidSheetName:
          rangeParams && "invalidSheetName" in rangeParams // 'attr in obj' instead of just 'obj.attr' because we accept undefined values
            ? rangeParams.invalidSheetName
            : this.invalidSheetName,
        invalidXc:
          rangeParams && "invalidXc" in rangeParams ? rangeParams.invalidXc : this.invalidXc,
        parts: rangeParams?.parts
          ? rangeParams.parts
          : this.parts.map((part) => {
              return { rowFixed: part.rowFixed, colFixed: part.colFixed };
            }),
        prefixSheet:
          rangeParams?.prefixSheet !== undefined ? rangeParams.prefixSheet : this.prefixSheet,
      },
      this.getSheetSize
    );
  }

  getRangePartString(
    part: 0 | 1,
    options: RangeStringOptions = { useBoundedReference: false, useFixedReference: false }
  ): string {
    const colFixed = this.parts[part]?.colFixed || options.useFixedReference ? "$" : "";
    const col = part === 0 ? numberToLetters(this.zone.left) : numberToLetters(this.zone.right);
    const rowFixed = this.parts[part]?.rowFixed || options.useFixedReference ? "$" : "";
    const row = part === 0 ? String(this.zone.top + 1) : String(this.zone.bottom + 1);

    let str = "";
    if (this.isFullCol && !options.useBoundedReference) {
      if (part === 0 && this.unboundedZone.hasHeader) {
        str = colFixed + col + rowFixed + row;
      } else {
        str = colFixed + col;
      }
    } else if (this.isFullRow && !options.useBoundedReference) {
      if (part === 0 && this.unboundedZone.hasHeader) {
        str = colFixed + col + rowFixed + row;
      } else {
        str = rowFixed + row;
      }
    } else {
      str = colFixed + col + rowFixed + row;
    }

    return str;
  }

  getRangeString(
    forSheetId: UID,
    getSheetName: (sheetId: UID) => string,
    options = { useBoundedReference: false, useFixedReference: false }
  ): string {
    if (!this) {
      return CellErrorType.InvalidReference;
    }
    if (this.invalidXc) {
      return this.invalidXc;
    }
    if (this.zone.bottom - this.zone.top < 0 || this.zone.right - this.zone.left < 0) {
      return CellErrorType.InvalidReference;
    }
    if (this.zone.left < 0 || this.zone.top < 0) {
      return CellErrorType.InvalidReference;
    }
    let prefixSheet = this.sheetId !== forSheetId || this.invalidSheetName || this.prefixSheet;
    let sheetName: string = "";
    if (prefixSheet) {
      if (this.invalidSheetName) {
        sheetName = this.invalidSheetName;
      } else {
        sheetName = getCanonicalSymbolName(getSheetName(this.sheetId));
      }
    }

    if (prefixSheet && !sheetName) {
      return CellErrorType.InvalidReference;
    }

    let rangeString = this.getRangePartString(0, options);
    if (this.parts && this.parts.length === 2) {
      // this if converts A2:A2 into A2 except if any part of the original range had fixed row or column (with $)
      if (
        this.zone.top !== this.zone.bottom ||
        this.zone.left !== this.zone.right ||
        this.parts[0].rowFixed ||
        this.parts[0].colFixed ||
        this.parts[1].rowFixed ||
        this.parts[1].colFixed
      ) {
        rangeString += ":";
        rangeString += this.getRangePartString(1, options);
      }
    }

    return `${prefixSheet ? sheetName + "!" : ""}${rangeString}`;
  }
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
  return range.clone({ sheetId });
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
          postProcessedRanges.push({
            ...dataSet,
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
          postProcessedRanges.push({
            ...dataSet,
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

export function getApplyRangeChange(cmd: Command): ApplyRangeChangeSheet | undefined {
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
        newRange = range.clone({ ...getInvalidRange() });
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
    range = range.clone({
      ...getInvalidRange(),
      invalidSheetName,
    });
    return { changeType: "REMOVE", range };
  };
}

function getApplyRangeChangeRenameSheet(cmd: RenameSheetCommand): ApplyRangeChange {
  return (range: Range) => {
    if (range.sheetId === cmd.sheetId) {
      return { changeType: "CHANGE", range };
    }
    if (cmd.name && range.invalidSheetName === cmd.name) {
      const invalidSheetName = undefined;
      const sheetId = cmd.sheetId;
      const newRange = range.clone({ sheetId, invalidSheetName });
      return { changeType: "CHANGE", range: newRange };
    }
    if (cmd.sheetName && range.invalidSheetName === cmd.sheetName) {
      const invalidSheetName = undefined;
      const sheetId = cmd.sheetId;
      const newRange = range.clone({ sheetId, invalidSheetName });
      return { changeType: "CHANGE", range: newRange };
    }
    return { changeType: "NONE" };
  };
}

function getApplyRangeChangeMoveRange(cmd: MoveRangeCommand): ApplyRangeChange {
  const originZone = cmd.target[0];
  return (range: Range) => {
    range.clone();
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
      range: adaptedRange.clone({ sheetId: targetSheetId, prefixSheet }),
    };
  };
}

function createAdaptedRange<Dimension extends "columns" | "rows" | "both">(
  range: Range,
  dimension: Dimension,
  operation: "MOVE" | "RESIZE",
  by: Dimension extends "both" ? [number, number] : number
) {
  const zone = createAdaptedZone(range.rangeData._zone, dimension, operation, by);
  const adaptedRange = range.clone({ unboundedZone: zone });
  return adaptedRange;
}

function getInvalidRange() {
  return {
    parts: [],
    prefixSheet: false,
    zone: { left: -1, top: -1, right: -1, bottom: -1 },
    sheetId: "",
    invalidXc: CellErrorType.InvalidReference,
  };
}
