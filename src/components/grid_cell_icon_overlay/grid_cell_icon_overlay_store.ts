import { CellPosition } from "../..";
import { isDefined } from "../../helpers";
import {
  GridCellIconProvider,
  gridCellIconRegistry,
} from "../../registries/grid_cell_icon_registry";
import { SpreadsheetStore } from "../../stores";

export interface GridCellIconParams extends Omit<GridCellIconProvider, "hasIcon"> {
  position: CellPosition;
  id: string;
  horizontalAlign: "right" | undefined;
}

export class GridCellIconStore extends SpreadsheetStore {
  mutators = ["addIconProvider", "removeIconProvider"] as const;

  private iconProviders: GridCellIconProvider[] = [];

  addIconProvider(iconProvider: GridCellIconProvider) {
    this.iconProviders.push(iconProvider);
  }

  removeIconProvider(iconProvider: GridCellIconProvider) {
    this.iconProviders = this.iconProviders.filter((provider) => provider !== iconProvider);
  }

  getIcon(position: CellPosition): GridCellIconParams | undefined {
    const iconProviders = [...this.iconProviders, ...gridCellIconRegistry.getAll()];

    for (const iconMatcher of iconProviders) {
      if (iconMatcher.hasIcon(this.getters, position)) {
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

  get icons(): GridCellIconParams[] {
    return this.getters
      .getVisibleCellPositions()
      .map((position) => this.getIcon(position))
      .filter(isDefined);
  }
}
