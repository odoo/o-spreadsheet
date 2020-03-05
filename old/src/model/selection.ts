import { isEqual, toCartesian, toXC, union } from "../helpers";
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
  let result: Zone | null = selection;
  function expand(z: Zone): Zone {
    const { left, right, top, bottom } = expandZone(state, z);
    return {
      left: Math.max(0, left),
      right: Math.min(state.cols.length - 1, right),
      top: Math.max(0, top),
      bottom: Math.min(state.rows.length - 1, bottom)
    };
  }

  // check if we can shrink selection
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
  } else {
    state.selection.zones = [selection];
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
  } else {
    state.selection.zones = [selection];
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
  const anchorCol = state.selection.anchor.col;
  const zone: Zone = {
    left: Math.min(anchorCol, col),
    top: 0,
    right: Math.max(anchorCol, col),
    bottom: state.rows.length - 1
  };
  state.selection.zones[state.selection.zones.length - 1] = zone;
}

export function increaseSelectRow(state: GridState, row: number) {
  const anchorRow = state.selection.anchor.row;
  const zone: Zone = {
    left: 0,
    top: Math.min(anchorRow, row),
    right: state.cols.length - 1,
    bottom: Math.max(anchorRow, row)
  };
  state.selection.zones[state.selection.zones.length - 1] = zone;
}

export function zoneIsEntireColumn(state: GridState, zone: Zone) {
  return zone.top === 0 && zone.bottom === state.rows.length - 1;
}

export function zoneIsEntireRow(state: GridState, zone: Zone) {
  return zone.left === 0 && zone.right === state.cols.length - 1;
}

export function getActiveCols(state: GridState): Set<number> {
  const activeCols = new Set<number>();
  for (let zone of state.selection.zones) {
    if (zoneIsEntireColumn(state, zone)) {
      for (let i = zone.left; i <= zone.right; i++) {
        activeCols.add(i);
      }
    }
  }
  return activeCols;
}

export function getActiveRows(state: GridState): Set<number> {
  const activeRows = new Set<number>();
  for (let zone of state.selection.zones) {
    if (zoneIsEntireRow(state, zone)) {
      for (let i = zone.top; i <= zone.bottom; i++) {
        activeRows.add(i);
      }
    }
  }
  return activeRows;
}

export function startNewComposerSelection(state: GridState): void {
  state.selection.anchor = { row: state.activeRow, col: state.activeCol };
}

/**
 * Converts the selection zone to a XC coordinate system
 *
 * The conversion also treats merges a one single cell
 *
 * Examples:
 * {top:0,left:0,right:0,bottom:0} ==> A1
 * {top:0,left:0,right:1,bottom:1} ==> A1:B2
 *
 * if A1:B2 is a merge:
 * {top:0,left:0,right:1,bottom:1} ==> A1
 */
export function selectionZoneXC(state: GridState): string {
  const zone = state.selection.zones[0];
  const topLeft = toXC(zone.left, zone.top);
  const botRight = toXC(zone.right, zone.bottom);

  if (topLeft != botRight && !state.mergeCellMap[topLeft]) {
    return topLeft + ":" + botRight;
  }

  return topLeft;
}

export function addHighlights(state: GridState, rangesUsed: { [keys: string]: string }) {
  let highlights = Object.keys(rangesUsed)
    .map(r1c1 => {
      const ranges = r1c1.split(":");
      let top: number, bottom: number, left: number, right: number;

      let c = toCartesian(ranges[0].trim());
      left = right = c[0];
      top = bottom = c[1];
      if (ranges.length === 2) {
        let d = toCartesian(ranges[1].trim());
        right = d[0];
        bottom = d[1];
        if (right < left) {
          [right, left] = [left, right];
        }
        if (bottom < top) {
          [bottom, top] = [top, bottom];
        }
      }

      let zone: Zone = { top, bottom, left, right };
      zone = expandZone(state, zone);

      return { zone, color: rangesUsed[r1c1] };
    })
    .filter(
      x =>
        x.zone.top >= 0 &&
        x.zone.left >= 0 &&
        x.zone.bottom < state.rows.length &&
        x.zone.right < state.cols.length
    );

  state.highlights = state.highlights.concat(highlights);
}
