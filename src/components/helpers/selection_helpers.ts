import { SelectionStreamProcessor } from "@odoo/o-spreadsheet-engine/types/selection_stream_processor";
import { getZoneArea } from "../../helpers";
import { Direction, Getters, Position, Zone } from "../../types";
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

export function moveAnchorWithinSelection(
  getters: Getters,
  selection: SelectionStreamProcessor,
  direction: Direction
) {
  const {
    anchor: { zone, cell },
  } = getters.getSelection();
  let currentPosition = { ...cell };
  let remaining = getZoneArea(zone);
  do {
    currentPosition = getNextCellInZone(currentPosition, zone, direction);
    remaining--;
  } while (remaining > 0 && !isNavigablePosition(getters, currentPosition));
  if (remaining > 0) {
    selection.updateAnchorCell(currentPosition.col, currentPosition.row, { scrollIntoView: true });
  }
}

function getNextCellInZone(position: Position, zone: Zone, direction: Direction): Position {
  let { col, row } = position;
  switch (direction) {
    case "right":
      if (col < zone.right) {
        col++;
      } else {
        col = zone.left;
        row = row < zone.bottom ? row + 1 : zone.top;
      }
      break;
    case "left":
      if (col > zone.left) {
        col--;
      } else {
        col = zone.right;
        row = row > zone.top ? row - 1 : zone.bottom;
      }
      break;
    case "down":
      if (row < zone.bottom) {
        row++;
      } else {
        row = zone.top;
        col = col < zone.right ? col + 1 : zone.left;
      }
      break;
    case "up":
      if (row > zone.top) {
        row--;
      } else {
        row = zone.bottom;
        col = col > zone.left ? col - 1 : zone.right;
      }
      break;
  }
  return { col, row };
}

function isNavigablePosition(getters: Getters, position: Position): boolean {
  const sheetId = getters.getActiveSheetId();
  if (
    getters.isHeaderHidden(sheetId, "COL", position.col) ||
    getters.isHeaderHidden(sheetId, "ROW", position.row)
  ) {
    return false;
  }
  const mainCell = getters.getMainCellPosition({
    sheetId,
    col: position.col,
    row: position.row,
  });
  return mainCell.col === position.col && mainCell.row === position.row;
}
