import type { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import { isCtrlKey } from "./dom_helpers";

const arrowMap = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
};

export function updateSelectionWithArrowKeys(
  ev: KeyboardEvent,
  selection: SelectionStreamProcessor
) {
  const direction = arrowMap[ev.key];
  if (ev.shiftKey) {
    selection.resizeAnchorZone(direction, isCtrlKey(ev) ? "end" : 1);
  } else {
    selection.moveAnchorCell(direction, isCtrlKey(ev) ? "end" : 1);
  }
}
