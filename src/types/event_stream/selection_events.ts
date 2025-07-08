import { AnchorZone } from "..";

export type SelectionEventOptions = {
  scrollIntoView?: boolean;
  unbounded?: boolean;
};

export interface SelectionEvent {
  anchor: AnchorZone;
  previousAnchor: AnchorZone;
  mode: "newAnchor" | "overrideSelection" | "updateAnchor" | "commitSelection";
  options: SelectionEventOptions;
}
