import { Component } from "@odoo/owl";
import { isDefined } from "../../helpers";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv } from "../../types";
import { DataValidationCheckbox } from "../data_validation_overlay/dv_checkbox/dv_checkbox";
import { DataValidationListIcon } from "../data_validation_overlay/dv_list_icon/dv_list_icon";
import { FilterIcon } from "../filters/filter_icon/filter_icon";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";
import { GridCellIconStore } from "./grid_cell_icon_overlay_store";

export class GridCellIconOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIconOverlay";
  static props = {};
  static components = { GridCellIcon };

  store!: Store<GridCellIconStore>;

  setup() {
    this.store = useStore(GridCellIconStore);
    this.store.addIconProvider({
      component: FilterIcon,
      hasIcon: (getters, cellPosition) => getters.isFilterHeader(cellPosition),
      type: "rightIcon",
    });
    this.store.addIconProvider({
      component: DataValidationCheckbox,
      hasIcon: (getters, cellPosition) => getters.isCellValidCheckbox(cellPosition),
      type: "exclusiveIcon",
    });
    this.store.addIconProvider({
      component: DataValidationListIcon,
      hasIcon: (getters, cellPosition) =>
        !getters.isReadonly() && getters.cellHasListDataValidationIcon(cellPosition),
      type: "rightIcon",
    });
  }

  get icons() {
    return Object.values(this.store.icons).filter(isDefined);
  }
}
