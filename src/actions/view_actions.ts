import { areZonesContinuous, numberToLetters } from "../helpers";
import { interactiveAddFilter } from "../helpers/ui/filter_interactive";
import { interactiveFreezeColumnsRows } from "../helpers/ui/freeze_interactive";
import { _t } from "../translation";
import type { SpreadsheetChildEnv } from "../types";
import type { Dimension } from "./../types/misc";
import type { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const hideCols: ActionSpec = {
  name: ACTIONS.HIDE_COLUMNS_NAME,
  execute: (env) => {
    const columns = env.model.getters.getElementsFromSelection("COL");
    env.model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
      dimension: "COL",
      elements: columns,
    });
  },
  isVisible: ACTIONS.NOT_ALL_VISIBLE_COLS_SELECTED,
  icon: "o-spreadsheet-Icon.HIDE_COL",
};

export const unhideCols: ActionSpec = {
  name: _t("Unhide columns"),
  execute: (env) => {
    const columns = env.model.getters.getElementsFromSelection("COL");
    env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
      dimension: "COL",
      elements: columns,
    });
  },
  isVisible: (env: SpreadsheetChildEnv) => {
    const hiddenCols = env.model.getters
      .getHiddenColsGroups(env.model.getters.getActiveSheetId())
      .flat();
    const currentCols = env.model.getters.getElementsFromSelection("COL");
    return currentCols.some((col) => hiddenCols.includes(col));
  },
};

export const unhideAllCols: ActionSpec = {
  name: _t("Unhide all columns"),
  execute: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: Array.from(Array(env.model.getters.getNumberCols(sheetId)).keys()),
    });
  },
  isVisible: (env: SpreadsheetChildEnv) =>
    env.model.getters.getHiddenColsGroups(env.model.getters.getActiveSheetId()).length > 0,
};

export const hideRows: ActionSpec = {
  name: ACTIONS.HIDE_ROWS_NAME,
  execute: (env) => {
    const rows = env.model.getters.getElementsFromSelection("ROW");
    env.model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
      dimension: "ROW",
      elements: rows,
    });
  },
  isVisible: ACTIONS.NOT_ALL_VISIBLE_ROWS_SELECTED,
  icon: "o-spreadsheet-Icon.HIDE_ROW",
};

export const unhideRows: ActionSpec = {
  name: _t("Unhide rows"),
  execute: (env) => {
    const columns = env.model.getters.getElementsFromSelection("ROW");
    env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
      dimension: "ROW",
      elements: columns,
    });
  },
  isVisible: (env: SpreadsheetChildEnv) => {
    const hiddenRows = env.model.getters
      .getHiddenRowsGroups(env.model.getters.getActiveSheetId())
      .flat();
    const currentRows = env.model.getters.getElementsFromSelection("ROW");
    return currentRows.some((col) => hiddenRows.includes(col));
  },
};

export const unhideAllRows: ActionSpec = {
  name: _t("Unhide all rows"),
  execute: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId,
      dimension: "ROW",
      elements: Array.from(Array(env.model.getters.getNumberRows(sheetId)).keys()),
    });
  },
  isVisible: (env: SpreadsheetChildEnv) =>
    env.model.getters.getHiddenRowsGroups(env.model.getters.getActiveSheetId()).length > 0,
};

export const unFreezePane: ActionSpec = {
  name: _t("Unfreeze"),
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
  name: _t("Freeze"),
  icon: "o-spreadsheet-Icon.FREEZE",
};

export const unFreezeRows: ActionSpec = {
  name: _t("No rows"),
  execute: (env) =>
    env.model.dispatch("UNFREEZE_ROWS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  isReadonlyAllowed: true,
  isVisible: (env) =>
    !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).ySplit,
};

export const freezeFirstRow: ActionSpec = {
  name: _t("1 row"),
  execute: (env) => interactiveFreezeColumnsRows(env, "ROW", 1),
  isReadonlyAllowed: true,
};

export const freezeSecondRow: ActionSpec = {
  name: _t("2 rows"),
  execute: (env) => interactiveFreezeColumnsRows(env, "ROW", 2),
  isReadonlyAllowed: true,
};

export const freezeCurrentRow: ActionSpec = {
  name: _t("Up to current row"),
  execute: (env) => {
    const { bottom } = env.model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(env, "ROW", bottom + 1);
  },
  isReadonlyAllowed: true,
};

export const unFreezeCols: ActionSpec = {
  name: _t("No columns"),
  execute: (env) =>
    env.model.dispatch("UNFREEZE_COLUMNS", {
      sheetId: env.model.getters.getActiveSheetId(),
    }),
  isReadonlyAllowed: true,
  isVisible: (env) =>
    !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).xSplit,
};

export const freezeFirstCol: ActionSpec = {
  name: _t("1 column"),
  execute: (env) => interactiveFreezeColumnsRows(env, "COL", 1),
  isReadonlyAllowed: true,
};

export const freezeSecondCol: ActionSpec = {
  name: _t("2 columns"),
  execute: (env) => interactiveFreezeColumnsRows(env, "COL", 2),
  isReadonlyAllowed: true,
};

export const freezeCurrentCol: ActionSpec = {
  name: _t("Up to current column"),
  execute: (env) => {
    const { right } = env.model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(env, "COL", right + 1);
  },
  isReadonlyAllowed: true,
};

export const viewGridlines: ActionSpec = {
  name: (env: SpreadsheetChildEnv) =>
    env.model.getters.getGridLinesVisibility(env.model.getters.getActiveSheetId())
      ? _t("Hide gridlines")
      : _t("Show gridlines"),
  execute: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    env.model.dispatch("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: !env.model.getters.getGridLinesVisibility(sheetId),
    });
  },
  icon: "o-spreadsheet-Icon.SHOW_HIDE_GRID",
};

export const viewFormulas: ActionSpec = {
  name: (env: SpreadsheetChildEnv) =>
    env.model.getters.shouldShowFormulas() ? "Hide formulas" : _t("Show formulas"),
  execute: (env) =>
    env.model.dispatch("SET_FORMULA_VISIBILITY", { show: !env.model.getters.shouldShowFormulas() }),
  isReadonlyAllowed: true,
  icon: "o-spreadsheet-Icon.SHOW_HIDE_FORMULA",
};

export const createRemoveFilter: ActionSpec = {
  name: (env) =>
    selectionContainsFilter(env) ? _t("Remove selected filters") : _t("Create filter"),
  isActive: (env) => selectionContainsFilter(env),
  isEnabled: (env) => !cannotCreateFilter(env),
  execute: (env) => createRemoveFilterAction(env),
  icon: "o-spreadsheet-Icon.FILTER_ICON_INACTIVE",
};

export const groupColumns: ActionSpec = {
  name: (env) => {
    const selection = env.model.getters.getSelectedZone();
    if (selection.left === selection.right) {
      return _t("Group column %s", numberToLetters(selection.left));
    }
    return _t(
      "Group columns %s - %s",
      numberToLetters(selection.left),
      numberToLetters(selection.right)
    );
  },
  execute: (env) => groupHeadersAction(env, "COL"),
  isVisible: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const selection = env.model.getters.getSelectedZone();
    const groups = env.model.getters.getHeaderGroupsInZone(sheetId, "COL", selection);

    return (
      ACTIONS.IS_ONLY_ONE_RANGE(env) &&
      !groups.some((group) => group.start === selection.left && group.end === selection.right)
    );
  },
  icon: "o-spreadsheet-Icon.GROUP_COLUMNS",
};

export const groupRows: ActionSpec = {
  name: (env) => {
    const selection = env.model.getters.getSelectedZone();
    if (selection.top === selection.bottom) {
      return _t("Group row %s", String(selection.top + 1));
    }
    return _t("Group rows %s - %s", String(selection.top + 1), String(selection.bottom + 1));
  },
  execute: (env) => groupHeadersAction(env, "ROW"),
  isVisible: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const selection = env.model.getters.getSelectedZone();
    const groups = env.model.getters.getHeaderGroupsInZone(sheetId, "ROW", selection);

    return (
      ACTIONS.IS_ONLY_ONE_RANGE(env) &&
      !groups.some((group) => group.start === selection.top && group.end === selection.bottom)
    );
  },
  icon: "o-spreadsheet-Icon.GROUP_ROWS",
};

export const ungroupColumns: ActionSpec = {
  name: (env) => {
    const selection = env.model.getters.getSelectedZone();
    if (selection.left === selection.right) {
      return _t("Ungroup column %s", numberToLetters(selection.left));
    }
    return _t(
      "Ungroup columns %s - %s",
      numberToLetters(selection.left),
      numberToLetters(selection.right)
    );
  },
  execute: (env) => ungroupHeaders(env, "COL"),
  icon: "o-spreadsheet-Icon.UNGROUP_COLUMNS",
};

export const ungroupRows: ActionSpec = {
  name: (env) => {
    const selection = env.model.getters.getSelectedZone();
    if (selection.top === selection.bottom) {
      return _t("Ungroup row %s", String(selection.top + 1));
    }
    return _t("Ungroup rows %s - %s", String(selection.top + 1), String(selection.bottom + 1));
  },
  execute: (env) => ungroupHeaders(env, "ROW"),
  icon: "o-spreadsheet-Icon.UNGROUP_ROWS",
};

function selectionContainsFilter(env: SpreadsheetChildEnv): boolean {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedZones = env.model.getters.getSelectedZones();
  return env.model.getters.doesZonesContainFilter(sheetId, selectedZones);
}

function cannotCreateFilter(env: SpreadsheetChildEnv): boolean {
  return !areZonesContinuous(...env.model.getters.getSelectedZones());
}

export function createRemoveFilterAction(env: SpreadsheetChildEnv) {
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

function groupHeadersAction(env: SpreadsheetChildEnv, dim: Dimension) {
  const selection = env.model.getters.getSelectedZone();
  const sheetId = env.model.getters.getActiveSheetId();
  env.model.dispatch("GROUP_HEADERS", {
    sheetId,
    dimension: dim,
    start: dim === "COL" ? selection.left : selection.top,
    end: dim === "COL" ? selection.right : selection.bottom,
  });
}

function ungroupHeaders(env: SpreadsheetChildEnv, dim: Dimension) {
  const selection = env.model.getters.getSelectedZone();
  const sheetId = env.model.getters.getActiveSheetId();
  env.model.dispatch("UNGROUP_HEADERS", {
    sheetId,
    dimension: dim,
    start: dim === "COL" ? selection.left : selection.top,
    end: dim === "COL" ? selection.right : selection.bottom,
  });
}

export function canUngroupHeaders(env: SpreadsheetChildEnv, dimension: Dimension): boolean {
  const sheetId = env.model.getters.getActiveSheetId();
  const selection = env.model.getters.getSelectedZones();
  return (
    selection.length === 1 &&
    env.model.getters.getHeaderGroupsInZone(sheetId, dimension, selection[0]).length > 0
  );
}
