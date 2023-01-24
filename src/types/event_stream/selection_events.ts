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

export interface AlterZone extends SelectionEventPayload {
  type: "AlterZone";
}

export type SelectionEvent = Readonly<ZonesSelected | HeadersSelected | AlterZone>;
