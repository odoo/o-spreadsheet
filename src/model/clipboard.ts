import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import { addCell, deleteCell, formatCell, getCell, setValue } from "./core";
import { evaluateCells } from "./evaluation";
import { Cell, GridState } from "./state";

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
  for (let j = top; j <= bottom; j++) {
    const vals: (Cell | null)[] = [];
    cells.push(vals);
    for (let i = left; i <= right; i++) {
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
  state.clipboard.status = "invisible";
  const values = content.replace(/\r/g, "").split("\n").map(vals => vals.split("\t"));
  const { activeCol, activeRow } = state;
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const xc = toXC(activeCol + j, activeRow + i);
      setValue(state, xc, values[i][j]);
    }
  }
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
      const originCell = cells[j][i];
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

/**
 * Format the current clipboard to a string suitable for being pasted in other
 * programs.
 *
 * - add a tab character between each concecutive cells
 * - add a newline character between each line
 */
export function getClipboardContent(state: GridState): string {
  if (!state.clipboard.cells) {
    return "";
  }
  return state.clipboard.cells
    .map(cells => {
      return cells.map(c => (c ? formatCell(state, c) : "")).join("\t");
    })
    .join("\n");
}
