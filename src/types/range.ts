import { UID, UnboundedZone, Zone } from "./misc";

export interface RangePart {
  readonly colFixed: boolean;
  readonly rowFixed: boolean;
}

export interface RangeStringOptions {
  useBoundedReference?: boolean;
  useFixedReference?: boolean;
}

export interface RangeData {
  _zone: Zone | UnboundedZone;
  _sheetId: UID;
}
