import { isDefined } from "../../helpers/misc";
import {
  GridIcon,
  IconsOfCell,
  iconsOnCellRegistry,
} from "../../registries/icons_on_cell_registry";
import { Command } from "../../types/commands";
import { Align, CellPosition } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { UIPlugin } from "../ui_plugin";

export class CellIconPlugin extends UIPlugin {
  static getters = ["doesCellHaveGridIcon", "getCellIcons", "getCellIconRect"] as const;

  private cellIconsCache: Record<string, Record<number, Record<number, GridIcon[]>>> = {};

  handlers = {
    UPDATE_CELL: this.clearCellIconsCache,
    DELETE_CONTENT: this.clearCellIconsCache,
    SET_FORMATTING: this.clearCellIconsCache,
    CLEAR_FORMATTING: this.clearCellIconsCache,
    SET_BORDER: this.clearCellIconsCache,
    SET_ZONE_BORDERS: this.clearCellIconsCache,
    SET_BORDERS_ON_TARGET: this.clearCellIconsCache,
    CLEAR_CELL: this.clearCellIconsCache,
    CLEAR_CELLS: this.clearCellIconsCache,
    SET_SHEET_BACKGROUND_COLOR: this.clearCellIconsCache,
    CREATE_TABLE: this.clearCellIconsCache,
    REMOVE_TABLE: this.clearCellIconsCache,
    UPDATE_TABLE: this.clearCellIconsCache,
    UPDATE_FILTER: this.clearCellIconsCache,
    ADD_CONDITIONAL_FORMAT: this.clearCellIconsCache,
    REMOVE_CONDITIONAL_FORMAT: this.clearCellIconsCache,
    CHANGE_CONDITIONAL_FORMAT_PRIORITY: this.clearCellIconsCache,
    HIDE_COLUMNS_ROWS: this.clearCellIconsCache,
    UNHIDE_COLUMNS_ROWS: this.clearCellIconsCache,
    GROUP_HEADERS: this.clearCellIconsCache,
    UNGROUP_HEADERS: this.clearCellIconsCache,
    FOLD_HEADER_GROUP: this.clearCellIconsCache,
    UNFOLD_HEADER_GROUP: this.clearCellIconsCache,
    FOLD_ALL_HEADER_GROUPS: this.clearCellIconsCache,
    UNFOLD_ALL_HEADER_GROUPS: this.clearCellIconsCache,
    FOLD_HEADER_GROUPS_IN_ZONE: this.clearCellIconsCache,
    UNFOLD_HEADER_GROUPS_IN_ZONE: this.clearCellIconsCache,
    CREATE_TABLE_STYLE: this.clearCellIconsCache,
    REMOVE_TABLE_STYLE: this.clearCellIconsCache,
    REMOVE_DATA_VALIDATION_RULE: this.clearCellIconsCache,
    ADD_DATA_VALIDATION_RULE: this.clearCellIconsCache,
    RESIZE_COLUMNS_ROWS: this.clearCellIconsCache,
    MOVE_RANGES: this.clearCellIconsCache,
    UPDATE_CHART: this.clearCellIconsCache,
    CREATE_CHART: this.clearCellIconsCache,
    DELETE_CHART: this.clearCellIconsCache,
    UPDATE_FIGURE: this.clearCellIconsCache,
    CREATE_FIGURE: this.clearCellIconsCache,
    DELETE_FIGURE: this.clearCellIconsCache,
    CREATE_IMAGE: this.clearCellIconsCache,
    CREATE_CAROUSEL: this.clearCellIconsCache,
    UPDATE_CAROUSEL: this.clearCellIconsCache,
    ADD_NEW_CHART_TO_CAROUSEL: this.clearCellIconsCache,
    ADD_FIGURES_CHART_TO_CAROUSEL: this.clearCellIconsCache,
    DUPLICATE_CAROUSEL_CHART: this.clearCellIconsCache,
    UPDATE_CAROUSEL_ACTIVE_ITEM: this.clearCellIconsCache,
    POPOUT_CHART_FROM_CAROUSEL: this.clearCellIconsCache,
    UPDATE_FIGURES: this.clearCellIconsCache,
  };

  handle(cmd: Command) {
    this.clearCellIconsCache();
  }

  private clearCellIconsCache() {
    this.cellIconsCache = {};
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
