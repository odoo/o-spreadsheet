import { DataValidationCheckbox } from "../components/data_validation_overlay/dv_checkbox/dv_checkbox";
import { DataValidationListIcon } from "../components/data_validation_overlay/dv_list_icon/dv_list_icon";
import { FilterIcon } from "../components/filters/filter_icon/filter_icon";
import { GridCellIconProvider } from "../components/grid_cell_icon_overlay/grid_cell_icon_overlay_store";
import { Registry } from "./registry";

export const gridCellIconRegistry = new Registry<GridCellIconProvider>();

gridCellIconRegistry.add("filter", {
  component: FilterIcon,
  hasIcon: (getters, cellPosition) => getters.isFilterHeader(cellPosition),
  type: "rightIcon",
});
gridCellIconRegistry.add("dataValidationCheckbox", {
  component: DataValidationCheckbox,
  hasIcon: (getters, cellPosition) => getters.isCellValidCheckbox(cellPosition),
  type: "exclusiveIcon",
});
gridCellIconRegistry.add("dataValidationListIcon", {
  component: DataValidationListIcon,
  hasIcon: (getters, cellPosition) =>
    !getters.isReadonly() && getters.cellHasListDataValidationIcon(cellPosition),
  type: "rightIcon",
});
