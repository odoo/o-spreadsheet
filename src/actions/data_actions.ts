import { getZoneArea } from "../helpers/index";
import { interactiveSortSelection } from "../helpers/sort";
import { _t } from "../translation";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";
import { createRemoveFilterAction } from "./view_actions";

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

<<<<<<< HEAD
export const createRemoveFilter: ActionSpec = {
  ...ACTIONS.CREATE_OR_REMOVE_FILTER_ACTION,
||||||| parent of f529d8f6a (temp)
export const addDataFilter: ActionSpec = {
  name: _t("Create filter"),
  execute: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const selection = env.model.getters.getSelection().zones;
    interactiveAddFilter(env, sheetId, selection);
  },
  isVisible: (env) => !ACTIONS.SELECTION_CONTAINS_FILTER(env),
  isEnabled: (env): boolean => {
    const selectedZones = env.model.getters.getSelectedZones();
    return areZonesContinuous(...selectedZones);
  },
  icon: "o-spreadsheet-Icon.MENU_FILTER_ICON",
=======
export const addRemoveDataFilter: ActionSpec = {
  name: (env) =>
    ACTIONS.SELECTION_CONTAINS_FILTER(env) ? _t("Remove filter") : _t("Create filter"),
  execute: (env) => createRemoveFilterAction(env),
  isEnabled: (env): boolean => {
    const selectedZones = env.model.getters.getSelectedZones();
    return areZonesContinuous(...selectedZones);
  },
  icon: "o-spreadsheet-Icon.MENU_FILTER_ICON",
>>>>>>> f529d8f6a (temp)
};

<<<<<<< HEAD
export const createRemoveFilterTool: ActionSpec = {
  ...ACTIONS.CREATE_OR_REMOVE_FILTER_ACTION,
  isActive: (env) => ACTIONS.SELECTED_TABLE_HAS_FILTERS(env),
};

||||||| parent of f529d8f6a (temp)
export const removeDataFilter: ActionSpec = {
  name: _t("Remove filter"),
  execute: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    env.model.dispatch("REMOVE_FILTER_TABLE", {
      sheetId,
      target: env.model.getters.getSelectedZones(),
    });
  },
  isVisible: ACTIONS.SELECTION_CONTAINS_FILTER,
  icon: "o-spreadsheet-Icon.MENU_FILTER_ICON",
};

=======
>>>>>>> f529d8f6a (temp)
export const splitToColumns: ActionSpec = {
  name: _t("Split text to columns"),
  sequence: 1,
  execute: (env) => env.openSidePanel("SplitToColumns", {}),
  isEnabled: (env) => env.model.getters.isSingleColSelected(),
  icon: "o-spreadsheet-Icon.SPLIT_TEXT",
};
