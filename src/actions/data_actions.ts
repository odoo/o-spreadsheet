import { areZonesContinuous } from "../helpers/index";
import { interactiveSortSelection } from "../helpers/sort";
import { _lt } from "../translation";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";
import { createRemoveFilterAction } from "./view_actions";

export const sortRange: ActionSpec = {
  name: _lt("Sort range"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.SORT_RANGE",
};

export const sortAscending: ActionSpec = {
  name: _lt("Ascending (A ⟶ Z)"),
  execute: (env) => {
    const { anchor, zones } = env.model.getters.getSelection();
    const sheetId = env.model.getters.getActiveSheetId();
    interactiveSortSelection(env, sheetId, anchor.cell, zones[0], "ascending");
  },
  icon: "o-spreadsheet-Icon.SORT_ASCENDING",
};

export const sortDescending: ActionSpec = {
  name: _lt("Descending (Z ⟶ A)"),
  execute: (env) => {
    const { anchor, zones } = env.model.getters.getSelection();
    const sheetId = env.model.getters.getActiveSheetId();
    interactiveSortSelection(env, sheetId, anchor.cell, zones[0], "descending");
  },
  icon: "o-spreadsheet-Icon.SORT_DESCENDING",
};

export const addRemoveDataFilter: ActionSpec = {
  name: (env) =>
    ACTIONS.SELECTION_CONTAINS_FILTER(env) ? _lt("Remove filter") : _lt("Create filter"),
  execute: (env) => createRemoveFilterAction(env),
  isEnabled: (env): boolean => {
    const selectedZones = env.model.getters.getSelectedZones();
    return areZonesContinuous(...selectedZones);
  },
  icon: "o-spreadsheet-Icon.MENU_FILTER_ICON",
};

// export const removeDataFilter: ActionSpec = {
//   name: _lt("Remove filter"),
//   execute: (env) => {
//     const sheetId = env.model.getters.getActiveSheetId();
//     env.model.dispatch("REMOVE_FILTER_TABLE", {
//       sheetId,
//       target: env.model.getters.getSelectedZones(),
//     });
//   },
//   isVisible: ACTIONS.SELECTION_CONTAINS_FILTER,
//   icon: "o-spreadsheet-Icon.MENU_FILTER_ICON",
// };

export const splitToColumns: ActionSpec = {
  name: _lt("Split text to columns"),
  sequence: 1,
  execute: (env) => env.openSidePanel("SplitToColumns", {}),
  isEnabled: (env) => env.model.getters.isSingleColSelected(),
  icon: "o-spreadsheet-Icon.SPLIT_TEXT",
};
