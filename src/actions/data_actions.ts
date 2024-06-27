import { getZoneArea } from "../helpers/index";
import { interactiveSortSelection } from "../helpers/sort";
import { _t } from "../translation";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const sortRange: ActionSpec = {
  name: _t("Sort range"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.SORT_RANGE",
};

export const sortAscending: ActionSpec = {
  name: _t("Ascending (A ⟶ Z)"),
  execute: (env) => {
    const { anchor, zones } = env.model.getters.getSelection();
    const sheetId = env.model.getters.getActiveSheetId();
    interactiveSortSelection(env, sheetId, anchor.cell, zones[0], "ascending");
  },
  icon: "o-spreadsheet-Icon.SORT_ASCENDING",
};

export const dataCleanup: ActionSpec = {
  name: _t("Data cleanup"),
  icon: "o-spreadsheet-Icon.DATA_CLEANUP",
};

export const removeDuplicates: ActionSpec = {
  name: _t("Remove duplicates"),
  execute: (env) => {
    if (getZoneArea(env.model.getters.getSelectedZone()) === 1) {
      env.model.selection.selectTableAroundSelection();
    }
    env.openSidePanel("RemoveDuplicates", {});
  },
};

export const trimWhitespace: ActionSpec = {
  name: _t("Trim whitespace"),
  execute: (env) => {
    env.model.dispatch("TRIM_WHITESPACE");
  },
};

export const sortDescending: ActionSpec = {
  name: _t("Descending (Z ⟶ A)"),
  execute: (env) => {
    const { anchor, zones } = env.model.getters.getSelection();
    const sheetId = env.model.getters.getActiveSheetId();
    interactiveSortSelection(env, sheetId, anchor.cell, zones[0], "descending");
  },
  icon: "o-spreadsheet-Icon.SORT_DESCENDING",
};

export const createRemoveFilter: ActionSpec = {
  ...ACTIONS.CREATE_OR_REMOVE_FILTER_ACTION,
};

export const createRemoveFilterTool: ActionSpec = {
  ...ACTIONS.CREATE_OR_REMOVE_FILTER_ACTION,
  isActive: (env) => ACTIONS.SELECTED_TABLE_HAS_FILTERS(env),
};

export const splitToColumns: ActionSpec = {
  name: _t("Split text to columns"),
  sequence: 1,
  execute: (env) => env.openSidePanel("SplitToColumns", {}),
  isEnabled: (env) => env.model.getters.isSingleColSelected(),
  icon: "o-spreadsheet-Icon.SPLIT_TEXT",
};

export const reinsertPivotMenu: ActionSpec = {
  id: "reinsert_pivot",
  name: _t("Re-insert pivot"),
  sequence: 1020,
  icon: "o-spreadsheet-Icon.INSERT_PIVOT",
  children: [ACTIONS.REINSERT_PIVOT_CHILDREN],
  isVisible: (env) => env.model.getters.getPivotIds().length > 0,
};
