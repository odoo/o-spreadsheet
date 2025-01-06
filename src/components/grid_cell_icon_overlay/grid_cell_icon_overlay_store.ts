import { ComponentConstructor } from "@odoo/owl";
import { CellPosition, Getters, SpreadsheetChildEnv } from "../..";
import { positionToXc } from "../../helpers";
import { SpreadsheetStore } from "../../stores";

export interface GridCellIconProvider {
  component: ComponentConstructor<{ cellPosition: CellPosition }, SpreadsheetChildEnv>;
  hasIcon: (getters: Getters, cellPosition: CellPosition) => boolean;
  type: "exclusiveIcon" | "rightIcon";
}

interface GridCellIcon extends Omit<GridCellIconProvider, "hasIcon"> {
  position: CellPosition;
  horizontalAlign: "right" | undefined;
}

export class GridCellIconStore extends SpreadsheetStore {
  mutators = ["addIconProvider", "removeIconProvider"] as const;

  private iconProviders: GridCellIconProvider[] = [];

  private iconCache: Record<string, GridCellIcon | undefined> | undefined = undefined;

  handle() {
    this.iconCache = undefined;
  }

  addIconProvider(iconProvider: GridCellIconProvider) {
    this.iconProviders.push(iconProvider);
    this.iconCache = undefined;
  }

  removeIconProvider(iconProvider: GridCellIconProvider) {
    this.iconProviders = this.iconProviders.filter((provider) => provider !== iconProvider);
    this.iconCache = undefined;
  }

  getIcon(position: CellPosition): GridCellIcon | undefined {
    for (const iconMatcher of this.iconProviders) {
      if (iconMatcher.hasIcon(this.getters, position)) {
        return {
          ...iconMatcher,
          position,
          horizontalAlign: iconMatcher.type === "rightIcon" ? "right" : undefined,
        };
      }
    }
    return undefined;
  }

  get icons(): Record<string, GridCellIcon | undefined> {
    if (!this.iconCache) {
      this.iconCache = {};
      for (const position of this.getters.getVisibleCellPositions()) {
        const xc = positionToXc(position);
        this.iconCache[xc] = this.getIcon(position);
      }
    }

    return this.iconCache;
  }
}
