import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";

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
    selection.resizeAnchorZone(direction, ev.ctrlKey ? "end" : 1);
  } else {
    selection.moveAnchorCell(direction, ev.ctrlKey ? "end" : 1);
  }
}
