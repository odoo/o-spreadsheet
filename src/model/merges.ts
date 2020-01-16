import { GridModel } from "./grid_model";
import { toXC, toCartesian } from "../helpers";

// ---------------------------------------------------------------------------
// Merges
// ---------------------------------------------------------------------------

/**
 * This method is silent, does not notify the user interface.  Also, it
 * does not ask for confirmation if we delete a cell content.
 */
export function addMerge(this: GridModel, m: string) {
  let id = this.nextId++;
  const [tl, br] = m.split(":");
  const [left, top] = toCartesian(tl);
  const [right, bottom] = toCartesian(br);
  this.merges[id] = {
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
        this.deleteCell(xc);
      }
      this.mergeCellMap[xc] = id;
    }
  }
}

export function mergeSelection(this: GridModel) {
  const { left, right, top, bottom } = this.selections.zones[this.selections.zones.length - 1];
  let tl = toXC(left, top);
  let br = toXC(right, bottom);
  if (tl !== br) {
    this.addMerge(`${tl}:${br}`);
    this.notify();
  }
}

export function unmergeSelection(this: GridModel) {
  const mergeId = this.mergeCellMap[this.activeXc];
  const { left, top, right, bottom } = this.merges[mergeId];
  delete this.merges[mergeId];
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const xc = toXC(c, r);
      delete this.mergeCellMap[xc];
    }
  }
  this.notify();
}

export function isMergeDestructive(this: GridModel): boolean {
  const { left, right, top, bottom } = this.selections.zones[this.selections.zones.length - 1];
  for (let row = top; row <= bottom; row++) {
    const actualRow = this.rows[row];
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
