import { Component } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import { SpreadsheetChildEnv } from "../../types";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";
import { GridCellIconStore } from "./grid_cell_icon_overlay_store";

export class GridCellIconOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIconOverlay";
  static props = {};
  static components = { GridCellIcon };

  store!: Store<GridCellIconStore>;

  setup() {
    this.store = useStore(GridCellIconStore);
  }
}
