import { interactiveCut } from "../helpers/ui/cut_interactive";
import { interactiveAddMerge } from "../helpers/ui/merge_interactive";
import { handlePasteResult } from "../helpers/ui/paste_interactive";
import { doesAnyZoneCrossFrozenPane, getZoneArea, hasOverlappingZones } from "../helpers/zones";
import { Model } from "../model";
import { _t } from "../translation";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const undo: ActionSpec = {
  name: _t("Undo"),
  shortcut: "Ctrl+Z",
  execute: (model) => model.dispatch("REQUEST_UNDO"),
  isEnabled: (model) => model.getters.canUndo(),
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.UNDO",
};

export const redo: ActionSpec = {
  name: _t("Redo"),
  shortcut: "Ctrl+Y",
  execute: (model) => model.dispatch("REQUEST_REDO"),
  isEnabled: (model) => model.getters.canRedo(),
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.REDO",
};

export const copy: ActionSpec = {
  name: _t("Copy"),
  shortcut: "Ctrl+C",
  isReadonlyAllowed: true,
  execute: async (model, env) => {
    model.dispatch("COPY");
    await env.clipboard.write(await model.getters.getClipboardTextAndImageContent());
  },
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.CLIPBOARD",
};

export const cut: ActionSpec = {
  name: _t("Cut"),
  shortcut: "Ctrl+X",
  execute: async (model, env) => {
    interactiveCut(model, env);
    await env.clipboard.write(await model.getters.getClipboardTextAndImageContent());
  },
  icon: "o-spreadsheet-Icon.CUT",
};

export const paste: ActionSpec = {
  name: _t("Paste"),
  shortcut: "Ctrl+V",
  execute: ACTIONS.PASTE_ACTION,
  icon: "o-spreadsheet-Icon.PASTE",
};

export const pasteSpecial: ActionSpec = {
  name: _t("Paste special"),
  isVisible: (model): boolean => {
    return !model.getters.isCutOperation();
  },
  icon: "o-spreadsheet-Icon.PASTE",
};

export const pasteSpecialValue: ActionSpec = {
  name: _t("Paste as value"),
  shortcut: "Ctrl+Shift+V",
  execute: ACTIONS.PASTE_AS_VALUE_ACTION,
};

export const pasteSpecialFormat: ActionSpec = {
  name: _t("Paste format only"),
  execute: ACTIONS.PASTE_FORMAT_ACTION,
};

export const findAndReplace: ActionSpec = {
  name: _t("Find and replace"),
  shortcut: "Ctrl+H",
  isReadonlyAllowed: true,
  isEnabledOnLockedSheet: true,
  execute: (model, env) => {
    env.openSidePanel("FindAndReplace", {});
  },
  isEnabled: (model, env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.SEARCH",
};

export const deleteValues: ActionSpec = {
  name: _t("Delete values"),
  execute: (model, env) =>
    model.dispatch("DELETE_UNFILTERED_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    }),
};

export const deleteRows: ActionSpec = {
  name: ACTIONS.REMOVE_ROWS_NAME,
  execute: ACTIONS.REMOVE_ROWS_ACTION,
  isVisible: (model) => ACTIONS.CAN_REMOVE_COLUMNS_ROWS(model, "ROW"),
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
  isVisible: (model) => ACTIONS.CAN_REMOVE_COLUMNS_ROWS(model, "COL"),
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
  execute: (model, env) => {
    const zone = model.getters.getSelectedZone();
    const result = model.dispatch("DELETE_CELL", { zone, shiftDimension: "ROW" });
    handlePasteResult(model, env, result);
  },
};

export const deleteCellShiftLeft: ActionSpec = {
  name: _t("Delete cell and shift left"),
  execute: (model, env) => {
    const zone = model.getters.getSelectedZone();
    const result = model.dispatch("DELETE_CELL", { zone, shiftDimension: "COL" });
    handlePasteResult(model, env, result);
  },
};

export const mergeCells: ActionSpec = {
  name: _t("Merge cells"),
  isEnabled: (model) => !cannotMerge(model),
  isActive: (model) => hasMergeInAnySelectedZone(model),
  execute: (model, env) => toggleMerge(model, env),
  icon: "o-spreadsheet-Icon.MERGE_CELL",
};

export const editTable: ActionSpec = {
  name: () => _t("Edit table"),
  execute: (model, env) => env.openSidePanel("TableSidePanel", {}),
  icon: "o-spreadsheet-Icon.EDIT_TABLE",
};

export const deleteTable: ActionSpec = {
  name: () => _t("Delete table"),
  execute: ACTIONS.DELETE_SELECTED_TABLE,
  icon: "o-spreadsheet-Icon.DELETE_TABLE",
};

function cannotMerge(model: Model): boolean {
  const zones = model.getters.getSelectedZones();
  const { sheetId } = model.getters.getActivePosition();
  const { xSplit, ySplit } = model.getters.getPaneDivisions(sheetId);
  return (
    zones.every((zone) => getZoneArea(zone) === 1) ||
    doesAnyZoneCrossFrozenPane(zones, xSplit, ySplit) ||
    hasOverlappingZones(zones)
  );
}

function hasMergeInAnySelectedZone(model: Model): boolean {
  if (cannotMerge(model)) {
    return false;
  }

  const sheetId = model.getters.getActiveSheetId();
  const zones = model.getters.getSelectedZones();
  return zones.some((zone) => {
    return model.getters.getMergesInZone(sheetId, zone).length > 0;
  });
}

function toggleMerge(model: Model, env: SpreadsheetChildEnv) {
  if (cannotMerge(model)) {
    return;
  }

  const target = model.getters.getSelectedZones();
  const sheetId = model.getters.getActiveSheetId();
  if (hasMergeInAnySelectedZone(model)) {
    const mergesToRemove = target.flatMap((zone) => model.getters.getMergesInZone(sheetId, zone));
    model.dispatch("REMOVE_MERGE", { sheetId, target: mergesToRemove });
  } else {
    interactiveAddMerge(model, env, sheetId, target);
  }
}
