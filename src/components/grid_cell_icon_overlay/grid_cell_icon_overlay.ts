import { Component } from "@odoo/owl";
import { GridIcon } from "../../registries/icons_on_cell_registry";
import { SpreadsheetChildEnv } from "../../types";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";

export class GridCellIconOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIconOverlay";
  static props = {};
  static components = { GridCellIcon };

  get icons() {
    const icons: GridIcon[] = [];
    for (const position of this.env.model.getters.getVisibleCellPositions()) {
      const cellIcons = this.env.model.getters.getCellIcons(position);
      icons.push(...cellIcons.filter((icon) => icon.component));
    }

    return icons;
  }
}
