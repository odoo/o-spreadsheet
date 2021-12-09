import { FILTERS_SORT_CELLS_ASCENDING, FILTERS_SORT_CELLS_DESCENDING } from ".";
import { FilterMenuItem } from "../../components/filters/filter_menu";
import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

export const filterMenuRegistry = new MenuItemRegistry();

filterMenuRegistry
  .add("sort_asc", {
    name: _lt("Sort A ⟶ Z"),
    sequence: 10,
    action: FILTERS_SORT_CELLS_ASCENDING,
  })
  .add("sort_desc", {
    name: _lt("Sort Z ⟶ A"),
    sequence: 20,
    action: FILTERS_SORT_CELLS_DESCENDING,
    separator: true,
  })
  .add("filter_comp", {
    name: "Filter comp",
    sequence: 30,
    component: FilterMenuItem,
  });
