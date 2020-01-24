import { isEqual, toXC, union } from "../helpers";
import { Zone, GridState } from "./state";
import { stopEditing } from "./core";

/**
 * Add all necessary merge to the current selection to make it valid
 */
function expandZone(state: GridState, zone: Zone): Zone {
  let { left, right, top, bottom } = zone;
  let result: Zone = { left, right, top, bottom };
  for (let i = left; i <= right; i++) {
    for (let j = top; j <= bottom; j++) {
      let mergeId = state.mergeCellMap[toXC(i, j)];
      if (mergeId) {
        result = union(state.merges[mergeId], result);
      }
    }
  }
  return isEqual(result, zone) ? result : expandZone(state, result);
}

export function moveSelection(state: GridState, deltaX: number, deltaY: number) {
  const selection = state.selection.zones[state.selection.zones.length - 1];
  const anchorCol = state.selection.anchor.col;
  const anchorRow = state.selection.anchor.row;
  const { left, right, top, bottom } = selection;
  if (top + deltaY < 0 || left + deltaX < 0) {
    return;
  }
  let result: Zone | null = selection;
  // check if we can shrink selection
  let expand = z => expandZone(state, z);

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
      state.selection.zones[state.selection.zones.length - 1] = result;
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
    state.selection.zones[state.selection.zones.length - 1] = result;
  }
}

export function removeSelectedColumn(state: GridState, col: number) {
  if (state.activeRow === col) {
    return;
  }
  for (let zone of state.selection.zones) {
    
  }
}

export function selectColumn(state: GridState, col: number, addToCurrent: boolean, merge: boolean) {
  if (merge) {
    addColumnToCurrentSelection(state, col);
  }
  stopEditing(state);
  state.activeCol = col;
  state.activeRow = 0;
  state.activeXc = toXC(col, 0);
  const selection = {
    top: 0,
    left: col,
    right: col,
    bottom: state.rows.length -1
  }
  state.selection.anchor = { col: state.activeCol, row: state.activeRow};
  if (addToCurrent) {
    state.selection.zones.push(selection);
  } else {
    state.selection.zones = [selection];
  }
}

export function selectRow(state: GridState, row: number, addToCurrent: boolean) {
  stopEditing(state);
  state.activeCol = 0;
  state.activeRow = row;
  state.activeXc = toXC(0, row);
  const selection = {
    top: row,
    left: 0,
    right: state.cols.length -1,
    bottom: row
  };
  state.selection.anchor = { col: state.activeCol, row: state.activeRow};
  if (addToCurrent) {
    state.selection.zones.push(selection);
  } else {
    state.selection.zones = [selection];
  }
}

export function selectAll(state: GridState) {
  stopEditing(state);
  state.activeCol = 0;
  state.activeRow = 0;
  state.activeXc = toXC(0, 0);
  const selection = {
    top: 0,
    left: 0,
    right: state.cols.length - 1,
    bottom: state.rows.length - 1,
  };
  state.selection.anchor = { col: state.activeCol, row: state.activeRow};
  state.selection.zones = [selection];
}

/**
 * Update the current selection to include the cell col/row.
 */
export function updateSelection(state: GridState, col: number, row: number) {
  console.log("Passe");
  const anchorCol = state.selection.anchor.col;
  const anchorRow = state.selection.anchor.row;
  const zone: Zone = {
    left: Math.min(anchorCol, col),
    top: Math.min(anchorRow, row),
    right: Math.max(anchorCol, col),
    bottom: Math.max(anchorRow, row)
  };
  state.selection.zones[state.selection.zones.length - 1] = expandZone(state, zone);
}

export function addColumnToCurrentSelection(state: GridState, col: number) {
  const anchorCol = state.selection.anchor.col;
  const zone: Zone = {
    left: Math.min(anchorCol, col),
    top: 0,
    right: Math.max(anchorCol, col),
    bottom: state.rows.length - 1
  }
  state.selection.zones[state.selection.zones.length - 1] = zone; 
}
