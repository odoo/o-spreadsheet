import { isEqual, toXC, toZone, union } from "../helpers";
import { Workbook, Zone } from "./types";

/**
 * Add all necessary merge to the current selection to make it valid
 */
function expandZone(state: Workbook, zone: Zone): Zone {
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

/**
 * set the flag that allow the user to make a selection using the mouse and keyboard, this selection will be
 * reflected in the composer
 */
export function setSelectingRange(state: Workbook, isSelecting: boolean) {
  state.isSelectingRange = isSelecting;
}

export function startNewComposerSelection(state: Workbook): void {
  state.selection.anchor = { row: state.activeRow, col: state.activeCol };
}

/**
 * Add the highlights of the composer to the state.
 * When the highlight are defined for a merge, it will expand to the size of the merge
 * @param state
 * @param rangesUsed
 */
export function addHighlights(state: Workbook, rangesUsed: { [keys: string]: string }) {
  let highlights = Object.keys(rangesUsed)
    .map(r1c1 => {
      let zone: Zone = toZone(r1c1);
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
