import { _lt } from "../translation";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const sortRange: ActionSpec = {
  name: _lt("Sort range"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const sortAscending: ActionSpec = {
  name: _lt("Ascending (A ⟶ Z)"),
  execute: ACTIONS.SORT_CELLS_ASCENDING,
};

export const sortDescending: ActionSpec = {
  name: _lt("Descending (Z ⟶ A)"),
  execute: ACTIONS.SORT_CELLS_DESCENDING,
};

export const addDataFilter: ActionSpec = {
  name: _lt("Create filter"),
  execute: ACTIONS.FILTERS_CREATE_FILTER_TABLE,
  isVisible: (env) => !ACTIONS.SELECTION_CONTAINS_FILTER(env),
  isEnabled: (env) => ACTIONS.SELECTION_IS_CONTINUOUS(env),
  icon: "o-spreadsheet-Icon.FILTER_ICON_INACTIVE",
};

export const removeDataFilter: ActionSpec = {
  name: _lt("Remove filter"),
  execute: ACTIONS.FILTERS_REMOVE_FILTER_TABLE,
  isVisible: ACTIONS.SELECTION_CONTAINS_FILTER,
  icon: "o-spreadsheet-Icon.FILTER_ICON_INACTIVE",
};

export const splitToColumns: ActionSpec = {
  name: _lt("Split text to columns"),
  sequence: 1,
  execute: (env) => env.openSidePanel("SplitToColumns", {}),
  isEnabled: (env) => env.model.getters.isSingleColSelected(),
};
