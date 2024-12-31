import { ComponentConstructor } from "@odoo/owl";
import { DataValidationCheckbox } from "../components/data_validation_overlay/dv_checkbox/dv_checkbox";
import { DataValidationListIcon } from "../components/data_validation_overlay/dv_list_icon/dv_list_icon";
import { FilterIcon } from "../components/filters/filter_icon/filter_icon";
import { CellPosition, Getters, SpreadsheetChildEnv } from "../types";
import { Registry } from "./registry";

interface Props {
  cellPosition: CellPosition;
}

export interface GridCellIconProvider {
  component: ComponentConstructor<Props, SpreadsheetChildEnv>;
  hasIcon: (getters: Getters, cellPosition: CellPosition) => boolean;
  type: "exclusiveIcon" | "rightIcon";
}

export const gridCellIconRegistry = new Registry<GridCellIconProvider>();

gridCellIconRegistry.add("filter_icon", {
  component: FilterIcon,
  hasIcon: (getters, cellPosition) => getters.isFilterHeader(cellPosition),
  type: "rightIcon",
});

gridCellIconRegistry.add("data_validation_checkbox", {
  component: DataValidationCheckbox,
  hasIcon: (getters, cellPosition) => getters.isCellValidCheckbox(cellPosition),
  type: "exclusiveIcon",
});

gridCellIconRegistry.add("data_validation_list", {
  component: DataValidationListIcon,
  hasIcon: (getters, cellPosition) =>
    !getters.isReadonly() && getters.cellHasListDataValidationIcon(cellPosition),
  type: "rightIcon",
});
