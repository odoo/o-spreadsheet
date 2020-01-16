import { GridModel } from "./grid_model";
import { isEqual, toXC, union } from "../helpers";
import { Zone } from "./types";

export function selectCell(this: GridModel, col: number, row: number, newRange: boolean = false) {
  if (!this.isSelectingRange) {
    this.stopEditing();
  }

  const xc = toXC(col, row);
  let zone: Zone;
  if (xc in this.mergeCellMap) {
    const merge = this.merges[this.mergeCellMap[xc]];
    zone = {
      left: merge.left,
      right: merge.right,
      top: merge.top,
      bottom: merge.bottom
    };
  } else {
    zone = {
      left: col,
      right: col,
      top: row,
      bottom: row
    };
  }

  if (newRange) {
    this.selections.zones.push(zone);
  } else {
    this.selections.zones = [zone];
  }
  this.selections.anchor.col = col;
  this.selections.anchor.row = row;

  if (!this.isSelectingRange) {
    this.activeCol = col;
    this.activeRow = row;
    this.activeXc = xc;
  }
  this.notify();
}

/**
 * Add all necessary merge to the current selection to make it valid
 */
function expandZone(model: GridModel, zone: Zone): Zone {
  let { left, right, top, bottom } = zone;
  let result: Zone = { left, right, top, bottom };
  for (let i = left; i <= right; i++) {
    for (let j = top; j <= bottom; j++) {
      let mergeId = model.mergeCellMap[toXC(i, j)];
      if (mergeId) {
        result = union(model.merges[mergeId], result);
      }
    }
  }
  return isEqual(result, zone) ? result : expandZone(model, result);
}

export function moveSelection(this: GridModel, deltaX: number, deltaY: number) {
  const selection = this.selections.zones[this.selections.zones.length - 1];
  const anchorCol = this.selections.anchor.col;
  const anchorRow = this.selections.anchor.row;
  const { left, right, top, bottom } = selection;
  if (top + deltaY < 0 || left + deltaX < 0) {
    return;
  }
  let result: Zone | null = selection;
  // check if we can shrink selection
  let expand = z => expandZone(this, z);

  let n = 0;
  while (result !== null) {
    n++;
    if (deltaX < 0) {
      result = anchorCol <= right - n ? expand({ top, left, bottom, right: right - n }) : null;
    }
    if (deltaX > 0) {
      result = left + n <= anchorCol ? expand({ top, left: left + n, bottom, right }) : null;
    }
    if (deltaY < 0) {
      result = anchorRow <= bottom - n ? expand({ top, left, bottom: bottom - n, right }) : null;
    }
    if (deltaY > 0) {
      result = top + n <= anchorRow ? expand({ top: top + n, left, bottom, right }) : null;
    }
    if (result && !isEqual(result, selection)) {
      this.selections.zones[this.selections.zones.length - 1] = result;
      this.notify();
      return;
    }
  }
  const currentZone = { top: anchorRow, bottom: anchorRow, left: anchorCol, right: anchorCol };
  const zoneWithDelta = {
    top: top + deltaY,
    left: left + deltaX,
    bottom: bottom + deltaY,
    right: right + deltaX
  };
  result = expand(union(currentZone, zoneWithDelta));
  if (!isEqual(result, selection)) {
    this.selections.zones[this.selections.zones.length - 1] = result;
    this.notify();
    return;
  }
}

export function selectColumn(this: GridModel, col: number) {
  this.stopEditing();
  this.activeCol = col;
  this.activeRow = 0;
  this.activeXc = toXC(col, 0);
  const selection = {
    top: 0,
    left: col,
    right: col,
    bottom: this.rows.length - 1
  };
  this.selections.anchor = { col: this.activeCol, row: this.activeRow };
  this.selections.zones = [selection];

  this.notify();
}

export function updateSelection(this: GridModel, col: number, row: number) {
  const anchorCol = this.selections.anchor.col;
  const anchorRow = this.selections.anchor.row;
  const zone: Zone = {
    left: Math.min(anchorCol, col),
    top: Math.min(anchorRow, row),
    right: Math.max(anchorCol, col),
    bottom: Math.max(anchorRow, row)
  };
  this.selections.zones[this.selections.zones.length - 1] = expandZone(this, zone);
  this.notify();
}
