import { isEqual, toXC, union } from "../helpers";
import { Zone, GridState } from "./state";
import { stopEditing, activateCell } from "./core";

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
  if (
    top + deltaY < 0 ||
    left + deltaX < 0 ||
    bottom + deltaY >= state.rows.length ||
    right + deltaX >= state.cols.length
  ) {
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

export function selectColumn(state: GridState, col: number, addToCurrent: boolean) {
  stopEditing(state);
  activateCell(state, col, 0);
  const selection = {
    top: 0,
    left: col,
    right: col,
    bottom: state.rows.length - 1
  };
  state.selection.anchor = { col: state.activeCol, row: state.activeRow };
  if (addToCurrent) {
    state.selection.zones.push(selection);
    state.selection.activeCols.add(col);
  } else {
    state.selection.zones = [selection];
    state.selection.activeCols = new Set([col]);
    state.selection.activeRows = new Set();
  }
}

export function selectRow(state: GridState, row: number, addToCurrent: boolean) {
  stopEditing(state);
  activateCell(state, 0, row);
  const selection = {
    top: row,
    left: 0,
    right: state.cols.length - 1,
    bottom: row
  };
  state.selection.anchor = { col: state.activeCol, row: state.activeRow };
  if (addToCurrent) {
    state.selection.zones.push(selection);
    state.selection.activeRows.add(row);
  } else {
    state.selection.zones = [selection];
    state.selection.activeCols = new Set();
    state.selection.activeRows = new Set([row]);
  }
}

export function selectAll(state: GridState) {
  stopEditing(state);
  activateCell(state, 0, 0);
  const selection = {
    top: 0,
    left: 0,
    right: state.cols.length - 1,
    bottom: state.rows.length - 1
  };
  state.selection.anchor = { col: state.activeCol, row: state.activeRow };
  state.selection.zones = [selection];
  state.selection.activeCols = new Set([...Array(state.cols.length).keys()]);
  state.selection.activeRows = new Set([...Array(state.rows.length).keys()]);
}

/**
 * Update the current selection to include the cell col/row.
 */
export function updateSelection(state: GridState, col: number, row: number) {
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

/**
 * set the flag that allow the user to make a selection using the mouse and keyboard, this selection will be
 * reflected in the composer
 */
export function setSelectingRange(state: GridState, isSelecting: boolean) {
  state.isSelectingRange = isSelecting;
}

export function increaseSelectColumn(state: GridState, col: number) {
  const oldSelection = state.selection.zones[state.selection.zones.length - 1];
  for (let i = oldSelection.left; i <= oldSelection.right; i++) {
    state.selection.activeCols.delete(i);
  }
  const anchorCol = state.selection.anchor.col;
  const zone: Zone = {
    left: Math.min(anchorCol, col),
    top: 0,
    right: Math.max(anchorCol, col),
    bottom: state.rows.length - 1
  };
  state.selection.zones[state.selection.zones.length - 1] = zone;
  for (let i = zone.left; i <= zone.right; i++) {
    state.selection.activeCols.add(i);
  }
}

export function increaseSelectRow(state: GridState, row: number) {
  const oldSelection = state.selection.zones[state.selection.zones.length - 1];
  for (let i = oldSelection.top; i <= oldSelection.bottom; i++) {
    state.selection.activeRows.delete(i);
  }
  const anchorRow = state.selection.anchor.row;
  const zone: Zone = {
    left: 0,
    top: Math.min(anchorRow, row),
    right: state.cols.length - 1,
    bottom: Math.max(anchorRow, row)
  };
  state.selection.zones[state.selection.zones.length - 1] = zone;
  for (let i = zone.top; i <= zone.bottom; i++) {
    state.selection.activeRows.add(i);
  }
}
