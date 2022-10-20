import { _lt } from "../translation";
import {
  CoreGetters,
  DeepWriteable,
  Range,
  RangeData,
  RangePart,
  UID,
  UnboundedZone,
  Zone,
  ZoneDimension,
} from "../types";
import { memoize } from "./misc";
import { isRowReference } from "./references";
import { toUnboundedZone } from "./zones";

function createRangePouPou(
  sheetId: UID,
  sheetXC: string,
  invalidSheetName: string | undefined,
  prefixSheet: boolean
): RangeImpl {
  const zone = toUnboundedZone(sheetXC);
  const parts = RangeImpl.getRangeParts(sheetXC, zone);
  const rangeInterface = { prefixSheet, zone, sheetId, invalidSheetName, parts };
  return new RangeImpl(rangeInterface).orderZone();
}

const createRangePipi = memoize((sheetId: UID) =>
  memoize((prefixSheet: boolean) =>
    memoize((invalidSheetName: string | undefined) =>
      memoize((sheetXC: string) =>
        createRangePouPou(sheetId, sheetXC, invalidSheetName, prefixSheet)
      )
    )
  )
);

export function createRangePaPa(
  sheetId: UID,
  sheetXC: string,
  invalidSheetName: string | undefined,
  prefixSheet: boolean,
  getSheetSize: (sheetId: UID) => ZoneDimension
): RangeImpl {
  const range = createRangePipi(sheetId)(prefixSheet)(invalidSheetName)(sheetXC);
  Object.assign(range, { getSheetSize });
  return range;
}

interface ConstructorArgs {
  readonly zone: Readonly<Zone | UnboundedZone>;
  readonly parts: Readonly<Readonly<RangePart>[]>;
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
  readonly invalidXc?: string | undefined;
  readonly prefixSheet: boolean = false;
  readonly sheetId: UID; // the sheet on which the range is defined
  readonly invalidSheetName?: string; // the name of any sheet that is invalid

  constructor(
    args: ConstructorArgs,
    private getSheetSize: (sheetId: UID) => ZoneDimension = () => ({ width: 0, height: 0 })
  ) {
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

  get zone(): Zone {
    const { left, top, bottom, right } = this._zone;
    if (right !== undefined && bottom !== undefined) return { left, top, right, bottom };
    else if (bottom === undefined && right !== undefined) {
      return { right, top, left, bottom: this.getSheetSize(this.sheetId).height - 1 };
    } else if (right === undefined && bottom !== undefined) {
      return { bottom, left, top, right: this.getSheetSize(this.sheetId).width - 1 };
    }
    throw new Error(_lt("Bad zone format"));
  }

  static getRangeParts(xc: string, zone: UnboundedZone): RangePart[] {
    const parts: DeepWriteable<RangePart[]> = xc.split(":").map((p) => {
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
      if (zone.left === zone.right) {
        parts[0].colFixed = parts[0].colFixed || parts[1].colFixed;
        parts[1].colFixed = parts[0].colFixed || parts[1].colFixed;
      }
    }
    if (isFullRow) {
      parts[0].colFixed = parts[0].colFixed || parts[1].colFixed;
      parts[1].colFixed = parts[0].colFixed || parts[1].colFixed;

      if (zone.top === zone.bottom) {
        parts[0].rowFixed = parts[0].rowFixed || parts[1].rowFixed;
        parts[1].rowFixed = parts[0].rowFixed || parts[1].rowFixed;
      }
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
    // if (!isZoneValid(zone)) {
    //   return [zone, parts];
    // }
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
