import { GridModel } from "./grid_model";
import { isEqual, toXC, union } from "../helpers";
import { Zone } from "./types";

export function selectCell(this: GridModel, col: number, row: number, newRange: boolean = false) {
  if (!this.state.isSelectingRange) {
    this.stopEditing();
  }

  const xc = toXC(col, row);
  let zone: Zone;
  if (xc in this.state.mergeCellMap) {
    const merge = this.state.merges[this.state.mergeCellMap[xc]];
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
    this.state.selection.zones.push(zone);
  } else {
    this.state.selection.zones = [zone];
  }
  this.state.selection.anchor.col = col;
  this.state.selection.anchor.row = row;

  if (!this.state.isSelectingRange) {
    this.state.activeCol = col;
    this.state.activeRow = row;
    this.state.activeXc = xc;
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
      let mergeId = model.state.mergeCellMap[toXC(i, j)];
      if (mergeId) {
        result = union(model.state.merges[mergeId], result);
      }
    }
  }
  return isEqual(result, zone) ? result : expandZone(model, result);
}

export function moveSelection(this: GridModel, deltaX: number, deltaY: number) {
  const selection = this.state.selection.zones[this.state.selection.zones.length - 1];
  const anchorCol = this.state.selection.anchor.col;
  const anchorRow = this.state.selection.anchor.row;
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
      this.state.selection.zones[this.state.selection.zones.length - 1] = result;
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
    this.state.selection.zones[this.state.selection.zones.length - 1] = result;
    this.notify();
    return;
  }
}

export function selectColumn(this: GridModel, col: number) {
  this.stopEditing();
  this.state.activeCol = col;
  this.state.activeRow = 0;
  this.state.activeXc = toXC(col, 0);
  const selection = {
    top: 0,
    left: col,
    right: col,
    bottom: this.state.rows.length - 1
  };
  this.state.selection.anchor = { col: this.state.activeCol, row: this.state.activeRow };
  this.state.selection.zones = [selection];

  this.notify();
}

export function updateSelection(this: GridModel, col: number, row: number) {
  const anchorCol = this.state.selection.anchor.col;
  const anchorRow = this.state.selection.anchor.row;
  const zone: Zone = {
    left: Math.min(anchorCol, col),
    top: Math.min(anchorRow, row),
    right: Math.max(anchorCol, col),
    bottom: Math.max(anchorRow, row)
  };
  this.state.selection.zones[this.state.selection.zones.length - 1] = expandZone(this, zone);
  this.notify();
}
