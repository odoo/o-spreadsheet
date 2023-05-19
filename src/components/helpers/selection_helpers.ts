import { SpreadsheetChildEnv } from "../../types";

const arrowMap = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
};
export function updateSelectionWithArrowKeys(ev: KeyboardEvent, env: SpreadsheetChildEnv) {
  const direction = arrowMap[ev.key];
  const isRtl = env.model.getters.isSheetDirectionRtl(env.model.getters.getActiveSheetId());
  if (ev.shiftKey) {
    // Flip the arrow direction horizontally
    let resizeDirection = direction;
    if (isRtl && (direction === "left" || direction === "right")) {
      if (direction === "left") {
        resizeDirection = "right";
      } else {
        resizeDirection = "left";
      }
      env.model.selection.resizeAnchorZone(resizeDirection, ev.ctrlKey ? "end" : 1);
    } else {
      env.model.selection.resizeAnchorZone(direction, ev.ctrlKey ? "end" : 1);
    }
  } else {
    // Flip the column index horizontally
    let moveDirection = direction;
    if (isRtl && (direction === "left" || direction === "right")) {
      if (direction === "left") {
        moveDirection = "right";
      } else {
        moveDirection = "left";
      }
      env.model.selection.moveAnchorCell(moveDirection, ev.ctrlKey ? "end" : 1);
    } else {
      env.model.selection.moveAnchorCell(direction, ev.ctrlKey ? "end" : 1);
    }
  }
}
