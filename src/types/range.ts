import { RangeStringOptions } from "../plugins/core";
import { Cloneable, UID, UnboundedZone, Zone } from "./misc";

export interface RangePart {
  readonly colFixed: boolean;
  readonly rowFixed: boolean;
}

export interface Range extends Cloneable<Range> {
  readonly zone: Readonly<Zone>;
  readonly unboundedZone: Readonly<UnboundedZone>;
  readonly parts: readonly RangePart[];
  readonly invalidXc?: string;
  /** true if the user provided the range with the sheet name */
  readonly prefixSheet: boolean;
  /** the name of any sheet that is invalid */
  readonly invalidSheetName?: string;
  /** the sheet on which the range is defined */
  readonly sheetId: UID;
  readonly rangeData: RangeData;

  getRangeString: (
    forSheetId: UID,
    getSheetName: (sheetId: UID) => string,
    options?: RangeStringOptions
  ) => string;
}

export interface RangeData {
  _zone: Zone | UnboundedZone;
  _sheetId: UID;
}
