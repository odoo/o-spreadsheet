import { isDefined } from "../../helpers/misc";
import {
  GridIcon,
  IconsOfCell,
  iconsOnCellRegistry,
} from "../../registries/icons_on_cell_registry";
import { Command } from "../../types/commands";
import { Align, CellPosition } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { CoreViewPlugin } from "../core_view_plugin";

export class CellIconPlugin extends CoreViewPlugin {
  static getters = ["doesCellHaveGridIcon", "getCellIcons", "getCellIconRect"] as const;

  private cellIconsCache: Record<string, Record<number, Record<number, GridIcon[]>>> = {};

  handle(cmd: Command) {
    if (cmd.type !== "SET_VIEWPORT_OFFSET") {
      this.cellIconsCache = {};
    }
  }

  getCellIcons(position: CellPosition): GridIcon[] {
    if (!this.cellIconsCache[position.sheetId]) {
      this.cellIconsCache[position.sheetId] = {};
    }
    if (!this.cellIconsCache[position.sheetId][position.col]) {
      this.cellIconsCache[position.sheetId][position.col] = {};
    }
    if (!this.cellIconsCache[position.sheetId][position.col][position.row]) {
      this.cellIconsCache[position.sheetId][position.col][position.row] =
        this.computeCellIcons(position);
    }
    return this.cellIconsCache[position.sheetId][position.col][position.row];
  }

  getCellIconRect(icon: GridIcon, cellRect: Rect): Rect {
    const cellPosition = icon.position;
    const cell = this.getters.getCell(cellPosition);

    const x = this.getIconHorizontalPosition(cellRect, icon.horizontalAlign, icon);
    const y = this.getters.computeTextYCoordinate(cellRect, icon.size, cell?.style?.verticalAlign);

    return { x: x, y: y, width: icon.size, height: icon.size };
  }

  private getIconHorizontalPosition(rect: Rect, align: Align, icon: GridIcon): number {
    const start = rect.x;
    const end = rect.x + rect.width;

    switch (align) {
      case "right":
        return end - icon.margin - icon.size;
      case "left":
        return start + icon.margin;
      default:
        const centeringOffset = Math.floor((end - start - icon.size) / 2);
        return end - icon.size - centeringOffset;
    }
  }

  private computeCellIcons(position: CellPosition): GridIcon[] {
    const icons: IconsOfCell = { left: undefined, right: undefined, center: undefined };
    const callbacks = iconsOnCellRegistry.getAll();
    for (const callback of callbacks) {
      const icon = callback(this.getters, position);
      if (
        icon &&
        (!icons[icon.horizontalAlign] || icon.priority > icons[icon.horizontalAlign]!.priority)
      ) {
        icons[icon.horizontalAlign] = icon;
      }
    }
    if (icons.center && (icons.left || icons.right)) {
      const sideIconsPriority = Math.max(icons.left?.priority || 0, icons.right?.priority || 0);
      if (icons.center.priority < sideIconsPriority) {
        icons.center = undefined;
      } else {
        icons.left = undefined;
        icons.right = undefined;
      }
    }
    return Object.values(icons).filter(isDefined);
  }

  doesCellHaveGridIcon(position: CellPosition): boolean {
    return Boolean(this.getCellIcons(position).length);
  }
}
