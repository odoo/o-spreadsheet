import { DEFAULT_VERTICAL_ALIGN, GRID_ICON_EDGE_LENGTH, GRID_ICON_MARGIN } from "../../constants";
import { isDefined, positionToZone } from "../../helpers/index";
import {
  GridIcon,
  IconsOfCell,
  iconsOnCellRegistry,
} from "../../registries/icons_on_cell_registry";
import { Command, Rect } from "../../types";
import { Align, CellPosition, VerticalAlign } from "../../types/misc";
import { CoreViewPlugin } from "../core_view_plugin";

export class CellIconPlugin extends CoreViewPlugin {
  static getters = [
    "doesCellHaveGridIcon",
    "getCellIcons",
    "getCellIconRect",
    "getVisibleCellIcons",
  ] as const;

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

  getVisibleCellIcons(): (GridIcon & { x: number; y: number })[] {
    const icons: (GridIcon & { x: number; y: number })[] = [];
    for (const position of this.getters.getVisibleCellPositions()) {
      const cellIcons = this.getters.getCellIcons(position);

      for (const icon of cellIcons) {
        const merge = this.getters.getMerge(icon.position);
        const zone = merge || positionToZone(icon.position);
        const cellRect = this.getters.getVisibleRectWithoutHeaders(zone);
        const cell = this.getters.getCell(icon.position);
        const verticalAlign = cell?.style?.verticalAlign || DEFAULT_VERTICAL_ALIGN;

        const x = this.getIconHorizontalPosition(cellRect, icon.horizontalAlign);
        const y = this.getIconVerticalPosition(cellRect, verticalAlign);
        icons.push({ ...icon, x, y });
      }
    }

    return icons;
  }

  getCellIconRect(icon: GridIcon): Rect {
    const cellPosition = icon.position;
    const merge = this.getters.getMerge(cellPosition);
    const zone = merge || positionToZone(cellPosition);
    const cellRect = this.getters.getVisibleRectWithoutHeaders(zone);
    const cell = this.getters.getCell(cellPosition);

    const verticalAlign = cell?.style?.verticalAlign || DEFAULT_VERTICAL_ALIGN;

    const x = this.getIconHorizontalPosition(cellRect, icon.horizontalAlign);
    const y = this.getIconVerticalPosition(cellRect, verticalAlign);
    return {
      x,
      y,
      width: GRID_ICON_EDGE_LENGTH,
      height: GRID_ICON_EDGE_LENGTH,
    };
  }

  private getIconVerticalPosition(rect: Rect, align: VerticalAlign): number {
    const start = rect.y;
    const end = rect.y + rect.height;

    switch (align) {
      case "bottom":
        return end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH;
      case "top":
        return start + GRID_ICON_MARGIN;
      default:
        const centeringOffset = Math.floor((end - start - GRID_ICON_EDGE_LENGTH) / 2);
        return end - GRID_ICON_EDGE_LENGTH - centeringOffset;
    }
  }

  private getIconHorizontalPosition(rect: Rect, align: Align): number {
    const start = rect.x;
    const end = rect.x + rect.width;

    switch (align) {
      case "right":
        return end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH;
      case "left":
        return start + GRID_ICON_MARGIN;
      default:
        const centeringOffset = Math.floor((end - start - GRID_ICON_EDGE_LENGTH) / 2);
        return end - GRID_ICON_EDGE_LENGTH - centeringOffset;
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
