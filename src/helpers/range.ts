import { _t } from "../translation";
import {
  CellPosition,
  CoreGetters,
  Getters,
  Range,
  RangeData,
  RangePart,
  UID,
  UnboundedZone,
  Zone,
  ZoneDimension,
} from "../types";
import { isRowReference, splitReference } from "./references";
import { getZoneArea, isZoneOrdered, positions, toUnboundedZone, zoneToXc } from "./zones";

interface ConstructorArgs {
  readonly zone: Readonly<Zone | UnboundedZone>;
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
  readonly zone: Readonly<Zone>;
  readonly parts: Range["parts"];
  readonly invalidXc?: string;
  readonly prefixSheet: boolean = false;
  readonly sheetId: UID; // the sheet on which the range is defined
  readonly invalidSheetName?: string; // the name of any sheet that is invalid

  constructor(args: ConstructorArgs, private getSheetSize: (sheetId: UID) => ZoneDimension) {
    this._zone = args.zone;

    this.prefixSheet = args.prefixSheet;
    this.invalidXc = args.invalidXc;

    this.sheetId = args.sheetId;
    this.invalidSheetName = args.invalidSheetName;

    this.zone = this.computeZone();
    let _fixedParts = [...args.parts];
    if (args.parts.length === 1 && getZoneArea(this.zone) > 1) {
      _fixedParts.push({ ...args.parts[0] });
    } else if (args.parts.length === 2 && getZoneArea(this.zone) === 1) {
      _fixedParts.pop();
    }
    this.parts = _fixedParts;
  }

  static fromRange(range: Range, getters: CoreGetters): RangeImpl {
    if (range instanceof RangeImpl) {
      return range;
    }
    return new RangeImpl(range, getters.getSheetSize);
  }

  get unboundedZone(): UnboundedZone {
    return this._zone;
  }

  computeZone(): Readonly<Zone> {
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
    return this.clone({ zone, parts });
  }

  /**
   *
   * @param rangeParams optional, values to put in the cloned range instead of the current values of the range
   */
  clone(rangeParams?: Partial<ConstructorArgs>): RangeImpl {
    return new RangeImpl(
      {
        zone: rangeParams?.zone ? rangeParams.zone : { ...this._zone },
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
        prefixSheet: rangeParams?.prefixSheet ? rangeParams.prefixSheet : this.prefixSheet,
      },
      this.getSheetSize
    );
  }
}

/**
 * Copy a range. If the range is on the sheetIdFrom, the range will target
 * sheetIdTo.
 */
export function copyRangeWithNewSheetId(sheetIdFrom: UID, sheetIdTo: UID, range: Range): Range {
  const sheetId = range.sheetId === sheetIdFrom ? sheetIdTo : range.sheetId;
  return range.clone({ sheetId });
}

/**
 * Create a range from a xc. If the xc is empty, this function returns undefined.
 */
export function createRange(getters: CoreGetters, sheetId: UID, range?: string): Range | undefined {
  return range ? getters.getRangeFromSheetXC(sheetId, range) : undefined;
}

/**
 * Spread multiple colrows zone to one row/col zone and add a many new input range as needed.
 * For example, A1:B4 will become [A1:A4, B1:B4]
 */
export function spreadRange(getters: Getters, ranges: string[]): string[] {
  const postProcessedRanges: string[] = [];
  for (const range of ranges) {
    if (!getters.isRangeValid(range)) {
      postProcessedRanges.push(range); // ignore invalid range
      continue;
    }

    const { sheetName } = splitReference(range);
    const sheetPrefix = sheetName ? `${sheetName}!` : "";
    const zone = toUnboundedZone(range);
    if (zone.bottom !== zone.top && zone.left != zone.right) {
      if (zone.right) {
        for (let j = zone.left; j <= zone.right; ++j) {
          postProcessedRanges.push(
            `${sheetPrefix}${zoneToXc({
              left: j,
              right: j,
              top: zone.top,
              bottom: zone.bottom,
            })}`
          );
        }
      } else {
        for (let j = zone.top; j <= zone.bottom!; ++j) {
          postProcessedRanges.push(
            `${sheetPrefix}${zoneToXc({
              left: zone.left,
              right: zone.right,
              top: j,
              bottom: j,
            })}`
          );
        }
      }
    } else {
      postProcessedRanges.push(range);
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
