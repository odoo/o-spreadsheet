import { Cloneable, UID, UnboundedZone, Zone } from "./misc";

export interface RangePart {
  colFixed: boolean;
  rowFixed: boolean;
}

export interface Range extends Cloneable<Range> {
  zone: Zone;
  parts: RangePart[];
  invalidXc?: string;
  /** true if the user provided the range with the sheet name */
  prefixSheet: boolean;
  /** the name of any sheet that is invalid */
  invalidSheetName?: string;
  /** the sheet on which the range is defined */
  sheetId: UID;
}

export interface RangeData {
  _zone: Zone | UnboundedZone;
  _sheetId: UID;
}
