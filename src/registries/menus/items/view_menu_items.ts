import { interactiveFreezeColumnsRows } from "../../../helpers/ui/freeze_interactive";
import { _lt } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types";
import { MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const hideColsMenuItem: MenuItemSpec = {
  name: ACTIONS.HIDE_COLUMNS_NAME,
  action: ACTIONS.HIDE_COLUMNS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const hiddenCols = env.model.getters.getHiddenColsGroups(sheetId).flat();
    return (
      env.model.getters.getNumberCols(sheetId) >
      hiddenCols.length + env.model.getters.getElementsFromSelection("COL").length
    );
  },
};

export const unhideColsMenuItem: MenuItemSpec = {
  name: _lt("Unhide columns"),
  action: ACTIONS.UNHIDE_COLUMNS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => {
    const hiddenCols = env.model.getters
      .getHiddenColsGroups(env.model.getters.getActiveSheetId())
      .flat();
    const currentCols = env.model.getters.getElementsFromSelection("COL");
    return currentCols.some((col) => hiddenCols.includes(col));
  },
};

export const unhideAllColsMenuItem: MenuItemSpec = {
  name: _lt("Unhide all columns"),
  action: ACTIONS.UNHIDE_ALL_COLUMNS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) =>
    env.model.getters.getHiddenColsGroups(env.model.getters.getActiveSheetId()).length > 0,
};

export const hideRowsMenuItem: MenuItemSpec = {
  name: ACTIONS.HIDE_ROWS_NAME,
  action: ACTIONS.HIDE_ROWS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const hiddenRows = env.model.getters.getHiddenRowsGroups(sheetId).flat();
    return (
      env.model.getters.getNumberRows(sheetId) >
      hiddenRows.length + env.model.getters.getElementsFromSelection("ROW").length
    );
  },
};

export const unhideRowsMenuItem: MenuItemSpec = {
  name: _lt("Unhide rows"),
  action: ACTIONS.UNHIDE_ROWS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) => {
    const hiddenRows = env.model.getters
      .getHiddenRowsGroups(env.model.getters.getActiveSheetId())
      .flat();
    const currentRows = env.model.getters.getElementsFromSelection("ROW");
    return currentRows.some((col) => hiddenRows.includes(col));
  },
};

export const unhideAllRowsMenuItem: MenuItemSpec = {
  name: _lt("Unhide all rows"),
  action: ACTIONS.UNHIDE_ALL_ROWS_ACTION,
  isVisible: (env: SpreadsheetChildEnv) =>
    env.model.getters.getHiddenRowsGroups(env.model.getters.getActiveSheetId()).length > 0,
};

export const unFreezePaneMenuItem: MenuItemSpec = {
  name: _lt("Unfreeze"),
  isVisible: (env) => {
    const { xSplit, ySplit } = env.model.getters.getPaneDivisions(
      env.model.getters.getActiveSheetId()
    );
    return xSplit + ySplit > 0;
  },
  action: (env) =>
    env.model.dispatch("UNFREEZE_COLUMNS_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
};

export const freezePaneMenuItem: MenuItemSpec = {
  name: _lt("Freeze"),
};

export const unFreezeRowsMenuItem: MenuItemSpec = {
  name: _lt("No rows"),
  action: (env) =>
    env.model.dispatch("UNFREEZE_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  isReadonlyAllowed: true,
  isVisible: (env) =>
    !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).ySplit,
};

export const freezeFirstRowMenuItem: MenuItemSpec = {
  name: _lt("1 row"),
  action: (env) => interactiveFreezeColumnsRows(env, "ROW", 1),
  isReadonlyAllowed: true,
};

export const freezeSecondRowMenuItem: MenuItemSpec = {
  name: _lt("2 rows"),
  action: (env) => interactiveFreezeColumnsRows(env, "ROW", 2),
  isReadonlyAllowed: true,
};

export const freezeCurrentRowMenuItem: MenuItemSpec = {
  name: _lt("Up to current row"),
  action: (env) => {
    const { bottom } = env.model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(env, "ROW", bottom + 1);
  },
  isReadonlyAllowed: true,
};

export const unFreezeColsMenuItem: MenuItemSpec = {
  name: _lt("No columns"),
  action: (env) =>
    env.model.dispatch("UNFREEZE_COLUMNS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  isReadonlyAllowed: true,
  isVisible: (env) =>
    !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).xSplit,
};

export const freezeFirstColMenuItem: MenuItemSpec = {
  name: _lt("1 column"),
  action: (env) => interactiveFreezeColumnsRows(env, "COL", 1),
  isReadonlyAllowed: true,
};

export const freezeSecondColMenuItem: MenuItemSpec = {
  name: _lt("2 columns"),
  action: (env) => interactiveFreezeColumnsRows(env, "COL", 2),
  isReadonlyAllowed: true,
};

export const freezeCurrentColMenuItem: MenuItemSpec = {
  name: _lt("Up to current column"),
  action: (env) => {
    const { right } = env.model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(env, "COL", right + 1);
  },
  isReadonlyAllowed: true,
};

export const viewGridlinesMenuItem: MenuItemSpec = {
  name: (env: SpreadsheetChildEnv) =>
    env.model.getters.getGridLinesVisibility(env.model.getters.getActiveSheetId())
      ? _lt("Hide gridlines")
      : _lt("Show gridlines"),
  action: ACTIONS.SET_GRID_LINES_VISIBILITY_ACTION,
};

export const viewFormulasMenuItem: MenuItemSpec = {
  name: (env: SpreadsheetChildEnv) =>
    env.model.getters.shouldShowFormulas() ? _lt("Hide formulas") : _lt("Show formulas"),
  action: ACTIONS.SET_FORMULA_VISIBILITY_ACTION,
  isReadonlyAllowed: true,
};
