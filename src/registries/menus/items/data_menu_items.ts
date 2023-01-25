import { _lt } from "../../../translation";
import { MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const sortRangeMenuItem: MenuItemSpec = {
  name: _lt("Sort range"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const sortAscendingenuItem: MenuItemSpec = {
  name: _lt("Ascending (A ⟶ Z)"),
  action: ACTIONS.SORT_CELLS_ASCENDING,
};

export const sortDescendingMenuItem: MenuItemSpec = {
  name: _lt("Descending (Z ⟶ A)"),
  action: ACTIONS.SORT_CELLS_DESCENDING,
};

export const addDataFilterMenuItem: MenuItemSpec = {
  name: _lt("Create filter"),
  action: ACTIONS.FILTERS_CREATE_FILTER_TABLE,
  isVisible: (env) => !ACTIONS.SELECTION_CONTAINS_FILTER(env),
  isEnabled: (env) => ACTIONS.SELECTION_IS_CONTINUOUS(env),
  icon: "o-spreadsheet-Icon.FILTER_ICON_INACTIVE",
};

export const removeDataFilterMenuItem: MenuItemSpec = {
  name: _lt("Remove filter"),
  action: ACTIONS.FILTERS_REMOVE_FILTER_TABLE,
  isVisible: ACTIONS.SELECTION_CONTAINS_FILTER,
  icon: "o-spreadsheet-Icon.FILTER_ICON_INACTIVE",
};
