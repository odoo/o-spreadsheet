import { isEqual, positionToZone } from "../../../helpers";
import { interactiveAddMerge } from "../../../helpers/ui/merge_interactive";
import { _lt } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types";
import { MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const undoMenuItem: MenuItemSpec = {
  name: _lt("Undo"),
  description: "Ctrl+Z",
  action: ACTIONS.UNDO_ACTION,
  isEnabled: (env) => env.model.getters.canUndo(),
  icon: "o-spreadsheet-Icon.UNDO",
};

export const redoMenuItem: MenuItemSpec = {
  name: _lt("Redo"),
  description: "Ctrl+Y",
  action: ACTIONS.REDO_ACTION,
  isEnabled: (env) => env.model.getters.canRedo(),
  icon: "o-spreadsheet-Icon.REDO",
};

export const copyMenuItem: MenuItemSpec = {
  name: _lt("Copy"),
  description: "Ctrl+C",
  isReadonlyAllowed: true,
  action: ACTIONS.COPY_ACTION,
};

export const cutMenuItem: MenuItemSpec = {
  name: _lt("Cut"),
  description: "Ctrl+X",
  action: ACTIONS.CUT_ACTION,
};

export const pasteMenuItem: MenuItemSpec = {
  name: _lt("Paste"),
  description: "Ctrl+V",
  action: ACTIONS.PASTE_ACTION,
};

export const pasteSpecialMenuItem: MenuItemSpec = {
  name: _lt("Paste special"),
  isVisible: ACTIONS.IS_NOT_CUT_OPERATION,
};

export const pasteSpecialValueMenuItem: MenuItemSpec = {
  name: _lt("Paste value only"),
  action: ACTIONS.PASTE_VALUE_ACTION,
};

export const pasteSpecialFormatMenuItem: MenuItemSpec = {
  name: _lt("Paste format only"),
  action: ACTIONS.PASTE_FORMAT_ACTION,
};

export const findAndReplaceMenuItem: MenuItemSpec = {
  name: _lt("Find and replace"),
  description: "Ctrl+H",
  isReadonlyAllowed: true,
  action: ACTIONS.OPEN_FAR_SIDEPANEL_ACTION,
};

export const deleteValuesMenuItem: MenuItemSpec = {
  name: _lt("Delete values"),
  action: ACTIONS.DELETE_CONTENT_ACTION,
};

export const deleteRowsMenuItem: MenuItemSpec = {
  name: ACTIONS.REMOVE_ROWS_NAME,
  action: ACTIONS.REMOVE_ROWS_ACTION,
};

export const deleteRowMenuItem: MenuItemSpec = {
  ...deleteRowsMenuItem,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const clearRowsMenuItem: MenuItemSpec = {
  name: ACTIONS.DELETE_CONTENT_ROWS_NAME,
  action: ACTIONS.DELETE_CONTENT_ROWS_ACTION,
};

export const deleteColsMenuItem: MenuItemSpec = {
  name: ACTIONS.REMOVE_COLUMNS_NAME,
  action: ACTIONS.REMOVE_COLUMNS_ACTION,
};

export const deleteColMenuItem: MenuItemSpec = {
  ...deleteColsMenuItem,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const clearColsMenuItem: MenuItemSpec = {
  name: ACTIONS.DELETE_CONTENT_COLUMNS_NAME,
  action: ACTIONS.DELETE_CONTENT_COLUMNS_ACTION,
};

export const deleteCellsMenuItem: MenuItemSpec = {
  name: _lt("Delete cells"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const deleteCellShiftUpMenuItem: MenuItemSpec = {
  name: _lt("Delete cell and shift up"),
  action: ACTIONS.DELETE_CELL_SHIFT_UP,
};

export const deleteCellShiftLeftMenuItem: MenuItemSpec = {
  name: _lt("Delete cell and shift left"),
  action: ACTIONS.DELETE_CELL_SHIFT_LEFT,
};

export const mergeCellsMenuItem: MenuItemSpec = {
  name: _lt("Merge cells"),
  isEnabled: (env) => !cannotMerge(env),
  isActive: (env) => isInMerge(env),
  action: (env) => toggleMerge(env),
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
