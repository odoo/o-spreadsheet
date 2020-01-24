import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import { Cell, GridState } from "./state";
import { getCell, deleteCell, addCell } from "./core";
import { evaluateCells } from "./evaluation";

export function cut(state: GridState) {
  console.warn("implement copySelection for multi selection");
  cutOrCopy(state, true);
}

export function copy(state: GridState) {
  console.warn("implement copySelection for multi selection");
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

export function paste(state: GridState) {
  console.warn("implement pasteSelection for multi selection");
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
