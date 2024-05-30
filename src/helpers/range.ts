import { _lt } from "../translation";
import {
  CoreGetters,
  Range,
  RangeData,
  RangePart,
  UID,
  UnboundedZone,
  Zone,
  ZoneDimension,
} from "../types";
import { isRowReference } from "./references";

interface ConstructorArgs {
  zone: Zone | UnboundedZone;
  parts: RangePart[];
  invalidXc?: string;
  /** true if the user provided the range with the sheet name */
  prefixSheet: boolean;
  /** the name of any sheet that is invalid */
  invalidSheetName?: string;
  /** the sheet on which the range is defined */
  sheetId: UID;
}

export class RangeImpl implements Range {
  private readonly _zone: Zone | UnboundedZone;
  readonly parts: RangePart[];
  readonly invalidXc?: string | undefined;
  readonly prefixSheet: boolean = false;
  readonly sheetId: UID; // the sheet on which the range is defined
  readonly invalidSheetName?: string; // the name of any sheet that is invalid

  constructor(args: ConstructorArgs, private getSheetSize: (sheetId: UID) => ZoneDimension) {
    this._zone = args.zone;
    this.parts = args.parts;
    this.prefixSheet = args.prefixSheet;
    this.invalidXc = args.invalidXc;

    this.sheetId = args.sheetId;
    this.invalidSheetName = args.invalidSheetName;
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

  get zone(): Readonly<Zone> {
    const { left, top, bottom, right } = this._zone;
    if (right !== undefined && bottom !== undefined) {
      return this._zone as Readonly<Zone>;
    } else if (bottom === undefined && right !== undefined) {
      return { right, top, left, bottom: this.getSheetSize(this.sheetId).height - 1 };
    } else if (right === undefined && bottom !== undefined) {
      return { bottom, left, top, right: this.getSheetSize(this.sheetId).width - 1 };
    }
    throw new Error(_lt("Bad zone format"));
  }

  static getRangeParts(xc: string, zone: UnboundedZone): RangePart[] {
    const parts: RangePart[] = xc.split(":").map((p) => {
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
   * (in place!)
   */
  orderZone() {
    if (this._zone.right !== undefined && this._zone.right < this._zone.left) {
      let right = this._zone.right;
      this._zone.right = this._zone.left;
      this._zone.left = right;

      let rightFixed = this.parts[1].colFixed;
      this.parts[1].colFixed = this.parts[0].colFixed;
      this.parts[0].colFixed = rightFixed;
    }

    if (this._zone.bottom !== undefined && this._zone.bottom < this._zone.top) {
      let bottom = this._zone.bottom;
      this._zone.bottom = this._zone.top;
      this._zone.top = bottom;

      let bottomFixed = this.parts[1].rowFixed;
      this.parts[1].rowFixed = this.parts[0].rowFixed;
      this.parts[0].rowFixed = bottomFixed;
    }
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
export function createValidRange(
  getters: CoreGetters,
  sheetId: UID,
  xc?: string
): Range | undefined {
  if (!xc) return;
  const range = getters.getRangeFromSheetXC(sheetId, xc);
  return !(range.invalidSheetName || range.invalidXc) ? range : undefined;
}
