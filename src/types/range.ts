import { Cloneable, UID, UnboundedZone, Zone } from "./misc";

export interface RangePart {
  readonly colFixed: boolean;
  readonly rowFixed: boolean;
}

export interface Range extends Cloneable<Range> {
  readonly zone: Readonly<Zone>;
  readonly parts: readonly RangePart[];
  readonly invalidXc?: string;
  /** true if the user provided the range with the sheet name */
  readonly prefixSheet: boolean;
  /** the name of any sheet that is invalid */
  readonly invalidSheetName?: string;
  /** the sheet on which the range is defined */
  readonly sheetId: UID;
  readonly rangeData: RangeData;
}

export interface RangeData {
  _zone: Zone | UnboundedZone;
  _sheetId: UID;
}
