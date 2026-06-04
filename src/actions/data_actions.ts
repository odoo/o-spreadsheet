import { interactiveSortSelection } from "../helpers/sort_interactive";
import { getZoneArea } from "../helpers/zones";
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
  execute: (model, env) => {
    const { anchor, zones } = model.getters.getSelection();
    const sheetId = model.getters.getActiveSheetId();
    interactiveSortSelection(model, env, sheetId, anchor.cell, zones[0], "asc");
  },
  icon: "o-spreadsheet-Icon.SORT_ASCENDING",
};

export const dataCleanup: ActionSpec = {
  name: _t("Data cleanup"),
  icon: "o-spreadsheet-Icon.DATA_CLEANUP",
};

export const removeDuplicates: ActionSpec = {
  name: _t("Remove duplicates"),
  execute: (model, env) => {
    if (getZoneArea(model.getters.getSelectedZone()) === 1) {
      model.selection.selectTableAroundSelection();
    }
    env.openSidePanel("RemoveDuplicates", {});
  },
  isEnabled: (model, env) => !env.isSmall,
};

export const trimWhitespace: ActionSpec = {
  name: _t("Trim whitespace"),
  execute: (model) => {
    model.dispatch("TRIM_WHITESPACE");
  },
};

export const sortDescending: ActionSpec = {
  name: _t("Descending (Z ⟶ A)"),
  execute: (model, env) => {
    const { anchor, zones } = model.getters.getSelection();
    const sheetId = model.getters.getActiveSheetId();
    interactiveSortSelection(model, env, sheetId, anchor.cell, zones[0], "desc");
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
  execute: (model, env) => env.openSidePanel("SplitToColumns", {}),
  isEnabled: (model, env) => !env.isSmall && model.getters.isSingleColSelected(),
  icon: "o-spreadsheet-Icon.SPLIT_TEXT",
};

export const columnStatistics: ActionSpec = {
  name: _t("Column statistics"),
  execute: (model, env) => env.openSidePanel("ColumnStats", {}),
  icon: "o-spreadsheet-Icon.COLUMN_STATS",
};

export const reinsertDynamicPivotMenu: ActionSpec = {
  id: "reinsert_dynamic_pivot",
  name: _t("Re-insert dynamic pivot"),
  sequence: 60,
  icon: "o-spreadsheet-Icon.INSERT_PIVOT",
  children: [ACTIONS.REINSERT_DYNAMIC_PIVOT_CHILDREN],
  isVisible: (model) =>
    model.getters.getPivotIds().some((id) => model.getters.getPivot(id).isValid()),
};

export const reinsertStaticPivotMenu: ActionSpec = {
  id: "reinsert_static_pivot",
  name: _t("Re-insert static pivot"),
  sequence: 70,
  icon: "o-spreadsheet-Icon.INSERT_PIVOT",
  children: [ACTIONS.REINSERT_STATIC_PIVOT_CHILDREN],
  isVisible: (model) =>
    model.getters.getPivotIds().some((id) => model.getters.getPivot(id).isValid()),
};
