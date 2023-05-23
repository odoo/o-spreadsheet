import { areZonesContinuous } from "../helpers";
import { interactiveAddFilter } from "../helpers/ui/filter_interactive";
import { interactiveFreezeColumnsRows } from "../helpers/ui/freeze_interactive";
import { _lt } from "../translation";
import { SpreadsheetChildEnv } from "../types";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const hideCols: ActionSpec = {
  name: ACTIONS.HIDE_COLUMNS_NAME,
  execute: ACTIONS.HIDE_COLUMNS_ACTION,
  isVisible: ACTIONS.NOT_ALL_VISIBLE_COLS_SELECTED,
  icon: "o-spreadsheet-Icon.HIDE_COL",
};

export const unhideCols: ActionSpec = {
  name: _lt("Unhide columns"),
  execute: ACTIONS.UNHIDE_COLUMNS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => {
    const hiddenCols = env.model.getters
      .getHiddenColsGroups(env.model.getters.getActiveSheetId())
      .flat();
    const currentCols = env.model.getters.getElementsFromSelection("COL");
    return currentCols.some((col) => hiddenCols.includes(col));
  },
};

export const unhideAllCols: ActionSpec = {
  name: _lt("Unhide all columns"),
  execute: ACTIONS.UNHIDE_ALL_COLUMNS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) =>
    env.model.getters.getHiddenColsGroups(env.model.getters.getActiveSheetId()).length > 0,
};

export const hideRows: ActionSpec = {
  name: ACTIONS.HIDE_ROWS_NAME,
  execute: ACTIONS.HIDE_ROWS_ACTION,
  isVisible: ACTIONS.NOT_ALL_VISIBLE_ROWS_SELECTED,
  icon: "o-spreadsheet-Icon.HIDE_ROW",
};

export const unhideRows: ActionSpec = {
  name: _lt("Unhide rows"),
  execute: ACTIONS.UNHIDE_ROWS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => {
    const hiddenRows = env.model.getters
      .getHiddenRowsGroups(env.model.getters.getActiveSheetId())
      .flat();
    const currentRows = env.model.getters.getElementsFromSelection("ROW");
    return currentRows.some((col) => hiddenRows.includes(col));
  },
};

export const unhideAllRows: ActionSpec = {
  name: _lt("Unhide all rows"),
  execute: ACTIONS.UNHIDE_ALL_ROWS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) =>
    env.model.getters.getHiddenRowsGroups(env.model.getters.getActiveSheetId()).length > 0,
};

export const unFreezePane: ActionSpec = {
  name: _lt("Unfreeze"),
  isVisible: (env) => {
    const { xSplit, ySplit } = env.model.getters.getPaneDivisions(
      env.model.getters.getActiveSheetId()
    );
    return xSplit + ySplit > 0;
  },
  execute: (env) =>
    env.model.dispatch("UNFREEZE_COLUMNS_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  icon: "o-spreadsheet-Icon.UNFREEZE",
};

export const freezePane: ActionSpec = {
  name: _lt("Freeze"),
  icon: "o-spreadsheet-Icon.FREEZE",
};

export const unFreezeRows: ActionSpec = {
  name: _lt("No rows"),
  execute: (env) =>
    env.model.dispatch("UNFREEZE_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  isReadonlyAllowed: true,
  isVisible: (env) =>
    !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).ySplit,
};

export const freezeFirstRow: ActionSpec = {
  name: _lt("1 row"),
  execute: (env) => interactiveFreezeColumnsRows(env, "ROW", 1),
  isReadonlyAllowed: true,
};

export const freezeSecondRow: ActionSpec = {
  name: _lt("2 rows"),
  execute: (env) => interactiveFreezeColumnsRows(env, "ROW", 2),
  isReadonlyAllowed: true,
};

export const freezeCurrentRow: ActionSpec = {
  name: _lt("Up to current row"),
  execute: (env) => {
    const { bottom } = env.model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(env, "ROW", bottom + 1);
  },
  isReadonlyAllowed: true,
};

export const unFreezeCols: ActionSpec = {
  name: _lt("No columns"),
  execute: (env) =>
    env.model.dispatch("UNFREEZE_COLUMNS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  isReadonlyAllowed: true,
  isVisible: (env) =>
    !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).xSplit,
};

export const freezeFirstCol: ActionSpec = {
  name: _lt("1 column"),
  execute: (env) => interactiveFreezeColumnsRows(env, "COL", 1),
  isReadonlyAllowed: true,
};

export const freezeSecondCol: ActionSpec = {
  name: _lt("2 columns"),
  execute: (env) => interactiveFreezeColumnsRows(env, "COL", 2),
  isReadonlyAllowed: true,
};

export const freezeCurrentCol: ActionSpec = {
  name: _lt("Up to current column"),
  execute: (env) => {
    const { right } = env.model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(env, "COL", right + 1);
  },
  isReadonlyAllowed: true,
};

export const viewGridlines: ActionSpec = {
  name: (env: SpreadsheetChildEnv) =>
    env.model.getters.getGridLinesVisibility(env.model.getters.getActiveSheetId())
      ? _lt("Hide gridlines")
      : _lt("Show gridlines"),
  execute: ACTIONS.SET_GRID_LINES_VISIBILITY_ACTION,
  icon: "o-spreadsheet-Icon.SHOW_HIDE_GRID",
};

export const viewFormulas: ActionSpec = {
  name: (env: SpreadsheetChildEnv) =>
    env.model.getters.shouldShowFormulas() ? _lt("Hide formulas") : _lt("Show formulas"),
  execute: ACTIONS.SET_FORMULA_VISIBILITY_ACTION,
  isReadonlyAllowed: true,
  icon: "o-spreadsheet-Icon.SHOW_HIDE_FORMULA",
};

export const createRemoveFilter: ActionSpec = {
  name: (env) =>
    selectionContainsFilter(env) ? _lt("Remove selected filters") : _lt("Create filter"),
  isActive: (env) => selectionContainsFilter(env),
  isEnabled: (env) => !cannotCreateFilter(env),
  execute: (env) => createRemoveFilterAction(env),
  icon: "o-spreadsheet-Icon.FILTER_ICON_INACTIVE",
};

function selectionContainsFilter(env: SpreadsheetChildEnv): boolean {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedZones = env.model.getters.getSelectedZones();
  return env.model.getters.doesZonesContainFilter(sheetId, selectedZones);
}

function cannotCreateFilter(env: SpreadsheetChildEnv): boolean {
  return !areZonesContinuous(...env.model.getters.getSelectedZones());
}

function createRemoveFilterAction(env: SpreadsheetChildEnv) {
  if (selectionContainsFilter(env)) {
    env.model.dispatch("REMOVE_FILTER_TABLE", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
    });
    return;
  }

  if (cannotCreateFilter(env)) {
    return;
  }
  env.model.selection.selectTableAroundSelection();
  const sheetId = env.model.getters.getActiveSheetId();
  const selection = env.model.getters.getSelectedZones();
  interactiveAddFilter(env, sheetId, selection);
}
