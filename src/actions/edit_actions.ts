import { isEqual, positionToZone } from "../helpers";
import { interactiveCut } from "../helpers/ui/cut_interactive";
import { interactiveAddMerge } from "../helpers/ui/merge_interactive";
import { handlePasteResult } from "../helpers/ui/paste_interactive";
import { _t } from "../translation";
import { SpreadsheetChildEnv } from "../types";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const undo: ActionSpec = {
  name: _t("Undo"),
  description: "Ctrl+Z",
  execute: (env) => env.model.dispatch("REQUEST_UNDO"),
  isEnabled: (env) => env.model.getters.canUndo(),
  icon: "o-spreadsheet-Icon.UNDO",
};

export const redo: ActionSpec = {
  name: _t("Redo"),
  description: "Ctrl+Y",
  execute: (env) => env.model.dispatch("REQUEST_REDO"),
  isEnabled: (env) => env.model.getters.canRedo(),
  icon: "o-spreadsheet-Icon.REDO",
};

export const copy: ActionSpec = {
  name: _t("Copy"),
  description: "Ctrl+C",
  isReadonlyAllowed: true,
  execute: async (env) => {
    env.model.dispatch("COPY", { target: env.model.getters.getSelectedZones() });
    await env.clipboard.write(env.model.getters.getClipboardContent());
  },
  icon: "o-spreadsheet-Icon.COPY",
};

export const cut: ActionSpec = {
  name: _t("Cut"),
  description: "Ctrl+X",
  execute: async (env) => {
    interactiveCut(env);
    await env.clipboard.write(env.model.getters.getClipboardContent());
  },
  icon: "o-spreadsheet-Icon.CUT",
};

export const paste: ActionSpec = {
  name: _t("Paste"),
  description: "Ctrl+V",
  execute: ACTIONS.PASTE_ACTION,
  icon: "o-spreadsheet-Icon.PASTE",
};

export const pasteSpecial: ActionSpec = {
  name: _t("Paste special"),
  isVisible: (env): boolean => {
    return !env.model.getters.isCutOperation();
  },
  icon: "o-spreadsheet-Icon.PASTE",
};

export const pasteSpecialValue: ActionSpec = {
  name: _t("Paste as value"),
  description: "Ctrl+Shift+V",
  execute: ACTIONS.PASTE_AS_VALUE_ACTION,
};

export const pasteSpecialFormat: ActionSpec = {
  name: _t("Paste format only"),
  execute: ACTIONS.PASTE_FORMAT_ACTION,
};

export const findAndReplace: ActionSpec = {
  name: _t("Find and replace"),
  description: "Ctrl+H",
  isReadonlyAllowed: true,
  execute: (env) => {
    env.openSidePanel("FindAndReplace", {});
  },
  icon: "o-spreadsheet-Icon.SEARCH",
};

export const deleteValues: ActionSpec = {
  name: _t("Delete values"),
  execute: (env) =>
    env.model.dispatch("DELETE_CONTENT", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
    }),
};

export const deleteRows: ActionSpec = {
  name: ACTIONS.REMOVE_ROWS_NAME,
  execute: ACTIONS.REMOVE_ROWS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => ACTIONS.CAN_REMOVE_COLUMNS_ROWS("ROW", env),
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
  isVisible: (env: SpreadsheetChildEnv) => ACTIONS.CAN_REMOVE_COLUMNS_ROWS("COL", env),
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
  name: _t("Delete cells"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const deleteCellShiftUp: ActionSpec = {
  name: _t("Delete cell and shift up"),
  execute: (env) => {
    const zone = env.model.getters.getSelectedZone();
    const result = env.model.dispatch("DELETE_CELL", { zone, shiftDimension: "ROW" });
    handlePasteResult(env, result);
  },
};

export const deleteCellShiftLeft: ActionSpec = {
  name: _t("Delete cell and shift left"),
  execute: (env) => {
    const zone = env.model.getters.getSelectedZone();
    const result = env.model.dispatch("DELETE_CELL", { zone, shiftDimension: "COL" });
    handlePasteResult(env, result);
  },
};

export const mergeCells: ActionSpec = {
  name: _t("Merge cells"),
  isEnabled: (env) => !cannotMerge(env),
  isActive: (env) => isInMerge(env),
  execute: (env) => toggleMerge(env),
  icon: "o-spreadsheet-Icon.MERGE_CELL",
};

export const editTable: ActionSpec = {
  name: () => _t("Edit table"),
  execute: (env) => env.openSidePanel("TableSidePanel", {}),
  icon: "o-spreadsheet-Icon.EDIT_TABLE",
};

export const deleteTable: ActionSpec = {
  name: () => _t("Delete table"),
  execute: ACTIONS.DELETE_SELECTED_TABLE,
  icon: "o-spreadsheet-Icon.DELETE_TABLE",
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
