import { Workbook } from "./types";



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

