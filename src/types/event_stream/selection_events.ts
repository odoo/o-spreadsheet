import { AnchorZone } from "@odoo/o-spreadsheet-engine";

export type SelectionEventOptions = {
  scrollIntoView?: boolean;
  unbounded?: boolean;
};

export interface SelectionEvent {
  anchor: AnchorZone;
  previousAnchor: AnchorZone;
  mode: "newAnchor" | "overrideSelection" | "updateAnchor";
  options: SelectionEventOptions;
}
