import { toXC, toCartesian } from "../helpers";
import { GridState } from "./state";
import { deleteCell } from "./core";

// ---------------------------------------------------------------------------
// Merges
// ---------------------------------------------------------------------------

/**
 * This method is silent, does not notify the user interface.  Also, it
 * does not ask for confirmation if we delete a cell content.
 */
export function addMerge(state: GridState, m: string) {
  let id = state.nextId++;
  const [tl, br] = m.split(":");
  const [left, top] = toCartesian(tl);
  const [right, bottom] = toCartesian(br);
  state.merges[id] = {
    id,
    left,
    top,
    right,
    bottom,
    topLeft: tl
  };
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const xc = toXC(col, row);
      if (col !== left || row !== top) {
        deleteCell(state, xc);
      }
      state.mergeCellMap[xc] = id;
    }
  }
}

export function merge(state: GridState) {
  const { left, right, top, bottom } = state.selection.zones[state.selection.zones.length - 1];
  let tl = toXC(left, top);
  let br = toXC(right, bottom);
  if (tl !== br) {
    addMerge(state, `${tl}:${br}`);
  }
}

export function unmerge(state: GridState) {
  const mergeId = state.mergeCellMap[state.activeXc];
  const { left, top, right, bottom } = state.merges[mergeId];
  delete state.merges[mergeId];
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const xc = toXC(c, r);
      delete state.mergeCellMap[xc];
    }
  }
}

export function isMergeDestructive(state: GridState): boolean {
  const { left, right, top, bottom } = state.selection.zones[state.selection.zones.length - 1];
  for (let row = top; row <= bottom; row++) {
    const actualRow = state.rows[row];
    for (let col = left; col <= right; col++) {
      if (col !== left || row !== top) {
        const cell = actualRow.cells[col];
        if (cell && cell.content) {
          return true;
        }
      }
    }
  }
  return false;
}
