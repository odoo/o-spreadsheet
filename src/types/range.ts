import { _lt } from "../translation";
import { UID, UnboundZone, Zone, ZoneDimension } from "./misc";

export interface RangePart {
  colFixed: boolean;
  rowFixed: boolean;
}

interface RangeInterface {
  zone: Zone | UnboundZone; // the zone the range actually spans
  sheetId: UID; // the sheet on which the range is defined
  invalidSheetName?: string; // the name of any sheet that is invalid
  invalidXc?: string;
  parts: RangePart[];
  prefixSheet: boolean; // true if the user provided the range with the sheet name, so it has to be recomputed with the sheet name too
}

export class Range {
  _zone: Zone | UnboundZone; // the zone the range actually spans
  sheetId: UID; // the sheet on which the range is defined
  invalidSheetName?: string; // the name of any sheet that is invalid
  invalidXc?: string;
  parts: RangePart[];
  prefixSheet: boolean; // true if the user provided the range with the sheet name, so it has to be recomputed with the sheet name too
  _getSheetSize: (sheetId: UID) => ZoneDimension;

  constructor(rangeArgs: RangeInterface, getSheetSize: (sheetId: UID) => ZoneDimension) {
    this._zone = rangeArgs.zone;
    this.sheetId = rangeArgs.sheetId;
    this.invalidSheetName = rangeArgs.invalidSheetName;
    this.invalidXc = rangeArgs.invalidXc;
    this.parts = rangeArgs.parts;
    this.prefixSheet = rangeArgs.prefixSheet;
    this._getSheetSize = getSheetSize;
  }

  get isFullCol(): boolean {
    return this._zone.bottom === undefined;
  }

  get isFullRow(): boolean {
    return this._zone.right === undefined;
  }

  get unboundZone(): UnboundZone {
    return this._zone;
  }

  set unboundZone(zone: UnboundZone) {
    this._zone = zone;
  }

  get zone(): Zone {
    const { left, top, bottom, right } = this._zone;
    if (right !== undefined && bottom !== undefined) return { left, top, right, bottom };
    else if (bottom === undefined && right !== undefined) {
      return { right, top, left, bottom: this._getSheetSize(this.sheetId).height - 1 };
    } else if (right === undefined && bottom !== undefined) {
      return { bottom, left, top, right: this._getSheetSize(this.sheetId).width - 1 };
    }

    throw new Error(_lt("Bad zone format"));
  }

  set zone(zone: Zone) {
    this._zone = zone;
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

  clone(): Range {
    return new Range(
      {
        zone: { ...this._zone },
        sheetId: this.sheetId,
        invalidSheetName: this.invalidSheetName,
        invalidXc: this.invalidXc,
        parts: this.parts,
        prefixSheet: this.prefixSheet,
      },
      this._getSheetSize
    );
  }
}
