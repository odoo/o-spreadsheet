import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import { Cell, GridState } from "./state";
import { getCell, deleteCell, addCell, selectedCell, formatCell, setValue } from "./core";
import { evaluateCells } from "./evaluation";

export function cut(state: GridState) {
  // todo: implement copySelection for multi selection
  cutOrCopy(state, true);
}

export function copy(state: GridState) {
  // todo: implement copySelection for multi selection
  cutOrCopy(state, false);
}

function cutOrCopy(state: GridState, cut: boolean) {
  let { left, right, top, bottom } = state.selection.zones[state.selection.zones.length - 1];
  const cells: (Cell | null)[][] = [];
  for (let i = left; i <= right; i++) {
    const vals: (Cell | null)[] = [];
    cells.push(vals);
    for (let j = top; j <= bottom; j++) {
      const cell = getCell(state, i, j);
      vals.push(cell ? Object.assign({}, cell) : null);
    }
  }
  state.clipboard.status = "visible";
  state.clipboard.shouldCut = cut;
  state.clipboard.zones = [{ left, right, top, bottom }];
  state.clipboard.cells = cells;
}

/**
 * Paste some content at the active location
 *
 * The paste operation has two possible types of sources:
 * - either the os clipboard (the paste comes from outside)
 * - or internal clipboard: paste come from the spreadsheet itself
 */
export function paste(state: GridState, clipboardContent?: string) {
  if (clipboardContent === undefined) {
    pasteFromModel(state);
  } else {
    pasteFromClipboard(state, clipboardContent);
  }
}

function pasteFromClipboard(state: GridState, content: string) {
  // todo: manage multicell pastes.
  // This means: tab/newline to base a rectangular array of content
  state.clipboard.status = "invisible";
  setValue(state, state.activeXc, content);
}

function pasteFromModel(state: GridState) {
  // todo: implement pasteSelection for multi selection
  const { zones, cells, shouldCut, status } = state.clipboard;
  if (!zones || !cells) {
    return;
  }
  if (status === "empty") {
    return;
  }
  state.clipboard.status = shouldCut ? "empty" : "invisible";
  const selection = state.selection.zones[state.selection.zones.length - 1];
  let col = selection.left;
  let row = selection.top;
  let { left, right, top, bottom } = zones[0];
  const offsetX = col - left;
  const offsetY = row - top;
  for (let i = 0; i <= right - left; i++) {
    for (let j = 0; j <= bottom - top; j++) {
      const xc = toXC(col + i, row + j);
      const originCell = cells[i][j];
      const targetCell = getCell(state, col + i, row + j);
      if (originCell) {
        let content = originCell.content || "";
        if (originCell.type === "formula") {
          content = applyOffset(content, offsetX, offsetY);
        }
        let { style, border } = originCell;
        addCell(state, xc, { content, style, border });
        if (shouldCut) {
          deleteCell(state, originCell.xc, true);
        }
      }
      if (!originCell && targetCell) {
        addCell(state, xc, { content: "" });
      }
    }
  }

  evaluateCells(state);
}

export function getClipboardContent(state: GridState): string {
  // todo: manage multicells cut/copy
  // This should be a rectangular array of content, with tab/newlines
  const cell = selectedCell(state);
  return cell ? formatCell(state, cell) : "";
}
