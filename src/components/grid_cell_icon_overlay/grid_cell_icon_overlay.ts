import { Component } from "@odoo/owl";
import { GridIcon } from "../../registries/icons_on_cell_registry";
import { Position, SpreadsheetChildEnv } from "../../types";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";

interface Props {
  hoveredCell: Partial<Position>;
}

export class GridCellIconOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIconOverlay";
  static props = {
    hoveredCell: Object,
  };
  static components = { GridCellIcon };

  get icons() {
    const icons: GridIcon[] = [];
    for (const position of this.env.model.getters.getVisibleCellPositions()) {
      const cellIcons = this.env.model.getters.getCellIcons(position);
      icons.push(
        ...cellIcons.filter((icon) => {
          if (!icon.component) {
            return false;
          }
          const hoveredCell = this.props.hoveredCell;
          if (
            icon.onlyDisplayOnHover &&
            (hoveredCell.col !== position.col || hoveredCell.row !== position.row)
          ) {
            return false;
          }
          return true;
        })
      );
    }

    return icons;
  }
}
