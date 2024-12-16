import { Component } from "@odoo/owl";
import { isDefined } from "../../helpers";
import {
  GridCellIconProvider,
  gridCellIconRegistry,
} from "../../registries/grid_cell_icon_registry";
import { CellPosition, SpreadsheetChildEnv } from "../../types";
import { GridCellIcon } from "../grid_cell_icon/grid_cell_icon";

interface MatchedIcon extends Omit<GridCellIconProvider, "hasIcon"> {
  position: CellPosition;
  id: string;
  horizontalAlign: "right" | undefined;
}

export class GridCellIconOverlay extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCellIconOverlay";
  static props = {};
  static components = { GridCellIcon };

  private getIcon(position: CellPosition): MatchedIcon | undefined {
    const iconMatchers = gridCellIconRegistry.getAll();

    for (const iconMatcher of iconMatchers) {
      if (iconMatcher.hasIcon(this.env.model.getters, position)) {
        return {
          position,
          id: `${position.sheetId}-${position.col}-${position.row}-${iconMatcher.component.name}`,
          ...iconMatcher,
          horizontalAlign: iconMatcher.type === "rightIcon" ? "right" : undefined,
        };
      }
    }
    return undefined;
  }

  getIcons(): MatchedIcon[] {
    return this.env.model.getters
      .getVisibleCellPositions()
      .map((position) => this.getIcon(position))
      .filter(isDefined);
  }
}
