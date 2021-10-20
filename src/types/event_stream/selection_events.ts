import { AnchorZone } from "..";

interface SelectionEventPayload {
  anchor: AnchorZone;
  previousAnchor: AnchorZone;
  mode: "newAnchor" | "overrideSelection" | "updateAnchor";
}

export interface ZonesSelected extends SelectionEventPayload {
  type: "ZonesSelected";
}

export interface HeadersSelected extends SelectionEventPayload {
  type: "HeadersSelected";
}

export interface AlterZoneCorner extends SelectionEventPayload {
  type: "AlterZoneCorner";
}

export type SelectionEvent = Readonly<ZonesSelected | HeadersSelected | AlterZoneCorner>;
