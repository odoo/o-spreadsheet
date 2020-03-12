import { toXC, toCartesian } from "../helpers";
import { WorkBookState } from "./state";
import { deleteCell } from "./core";
import { evaluateCells } from "./evaluation";
import { updateState } from "./history";

// ---------------------------------------------------------------------------
// Merges
// ---------------------------------------------------------------------------

export function addMerge(state: WorkBookState, m: string) {
  let id = state.nextId++;
  const [tl, br] = m.split(":");
  const [left, top] = toCartesian(tl);
  const [right, bottom] = toCartesian(br);
  updateState(state, ["merges", id], {
    id,
    left,
    top,
    right,
    bottom,
    topLeft: tl
  });
  let isDestructive = false;
  let previousMerges: Set<number> = new Set();
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const xc = toXC(col, row);
      if (col !== left || row !== top) {
        isDestructive = true;
        deleteCell(state, xc);
      }
      if (state.mergeCellMap[xc]) {
        previousMerges.add(state.mergeCellMap[xc]);
      }
      updateState(state, ["mergeCellMap", xc], id);
    }
  }
  for (let m of previousMerges) {
    updateState(state, ["merges", m], undefined);
  }
  if (isDestructive) {
    evaluateCells(state);
  }
}

/**
 * Merge the current selection. Note that:
 * - it assumes that we have a valid selection (no intersection with other
 *   merges)
 * - it does nothing if the merge is trivial: A1:A1
 */
export function merge(state: WorkBookState) {
  const { left, right, top, bottom } = state.selection.zones[state.selection.zones.length - 1];
  let tl = toXC(left, top);
  let br = toXC(right, bottom);
  if (tl !== br) {
    addMerge(state, `${tl}:${br}`);
  }
}

export function unmerge(state: WorkBookState) {
  const mergeId = state.mergeCellMap[state.activeXc];
  const { left, top, right, bottom } = state.merges[mergeId];
  updateState(state, ["merges", mergeId], undefined);
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const xc = toXC(c, r);
      updateState(state, ["mergeCellMap", xc], undefined);
    }
  }
}

/**
 * Return true if the current selection requires losing state if it is merged.
 * This happens when there is some textual content in other cells than the
 * top left.
 */
export function isMergeDestructive(state: WorkBookState): boolean {
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
