import { isEqual, positionToZone } from "../helpers";
import { interactiveAddMerge } from "../helpers/ui/merge_interactive";
import { _lt } from "../translation";
import { SpreadsheetChildEnv } from "../types";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const undo: ActionSpec = {
  name: _lt("Undo"),
  description: "Ctrl+Z",
  execute: ACTIONS.UNDO_ACTION,
  isEnabled: (env) => env.model.getters.canUndo(),
  icon: "o-spreadsheet-Icon.UNDO",
};

export const redo: ActionSpec = {
  name: _lt("Redo"),
  description: "Ctrl+Y",
  execute: ACTIONS.REDO_ACTION,
  isEnabled: (env) => env.model.getters.canRedo(),
  icon: "o-spreadsheet-Icon.REDO",
};

export const copy: ActionSpec = {
  name: _lt("Copy"),
  description: "Ctrl+C",
  isReadonlyAllowed: true,
  execute: ACTIONS.COPY_ACTION,
};

export const cut: ActionSpec = {
  name: _lt("Cut"),
  description: "Ctrl+X",
  execute: ACTIONS.CUT_ACTION,
};

export const paste: ActionSpec = {
  name: _lt("Paste"),
  description: "Ctrl+V",
  execute: ACTIONS.PASTE_ACTION,
};

export const pasteSpecial: ActionSpec = {
  name: _lt("Paste special"),
  isVisible: ACTIONS.IS_NOT_CUT_OPERATION,
};

export const pasteSpecialValue: ActionSpec = {
  name: _lt("Paste value only"),
  execute: ACTIONS.PASTE_VALUE_ACTION,
};

export const pasteSpecialFormat: ActionSpec = {
  name: _lt("Paste format only"),
  execute: ACTIONS.PASTE_FORMAT_ACTION,
};

export const findAndReplace: ActionSpec = {
  name: _lt("Find and replace"),
  description: "Ctrl+H",
  isReadonlyAllowed: true,
  execute: ACTIONS.OPEN_FAR_SIDEPANEL_ACTION,
};

export const deleteValues: ActionSpec = {
  name: _lt("Delete values"),
  execute: ACTIONS.DELETE_CONTENT_ACTION,
};

export const deleteRows: ActionSpec = {
  name: ACTIONS.REMOVE_ROWS_NAME,
  execute: ACTIONS.REMOVE_ROWS_ACTION,
};

export const deleteRow: ActionSpec = {
  ...deleteRows,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const clearRows: ActionSpec = {
  name: ACTIONS.DELETE_CONTENT_ROWS_NAME,
  execute: ACTIONS.DELETE_CONTENT_ROWS_ACTION,
};

export const deleteCols: ActionSpec = {
  name: ACTIONS.REMOVE_COLUMNS_NAME,
  execute: ACTIONS.REMOVE_COLUMNS_ACTION,
};

export const deleteCol: ActionSpec = {
  ...deleteCols,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const clearCols: ActionSpec = {
  name: ACTIONS.DELETE_CONTENT_COLUMNS_NAME,
  execute: ACTIONS.DELETE_CONTENT_COLUMNS_ACTION,
};

export const deleteCells: ActionSpec = {
  name: _lt("Delete cells"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const deleteCellShiftUp: ActionSpec = {
  name: _lt("Delete cell and shift up"),
  execute: ACTIONS.DELETE_CELL_SHIFT_UP,
};

export const deleteCellShiftLeft: ActionSpec = {
  name: _lt("Delete cell and shift left"),
  execute: ACTIONS.DELETE_CELL_SHIFT_LEFT,
};

export const mergeCells: ActionSpec = {
  name: _lt("Merge cells"),
  isEnabled: (env) => !cannotMerge(env),
  isActive: (env) => isInMerge(env),
  execute: (env) => toggleMerge(env),
  icon: "o-spreadsheet-Icon.MERGE_CELL",
};

function cannotMerge(env: SpreadsheetChildEnv): boolean {
  const zones = env.model.getters.getSelectedZones();
  const { top, left, right, bottom } = env.model.getters.getSelectedZone();
  const { sheetId } = env.model.getters.getActivePosition();
  const { xSplit, ySplit } = env.model.getters.getPaneDivisions(sheetId);
  return (
    zones.length > 1 ||
    (top === bottom && left === right) ||
    (left < xSplit && xSplit <= right) ||
    (top < ySplit && ySplit <= bottom)
  );
}

function isInMerge(env: SpreadsheetChildEnv): boolean {
  if (!cannotMerge(env)) {
    const zones = env.model.getters.getSelectedZones();
    const { col, row, sheetId } = env.model.getters.getActivePosition();
    const zone = env.model.getters.expandZone(sheetId, positionToZone({ col, row }));
    return isEqual(zones[0], zone);
  }
  return false;
}

function toggleMerge(env: SpreadsheetChildEnv) {
  if (cannotMerge(env)) {
    return;
  }
  const zones = env.model.getters.getSelectedZones();
  const target = [zones[zones.length - 1]];
  const sheetId = env.model.getters.getActiveSheetId();
  if (isInMerge(env)) {
    env.model.dispatch("REMOVE_MERGE", { sheetId, target });
  } else {
    interactiveAddMerge(env, sheetId, target);
  }
}
