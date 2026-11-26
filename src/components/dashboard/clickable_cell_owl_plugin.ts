import { usePlugin } from "@odoo/owl";
import { invalidateEvaluationCommands } from "../../command_registry";
import { toXC } from "../../helpers/coordinates";
import { positionToZone } from "../../helpers/zones";
import { ComponentConstructor } from "../../owl3_compatibility_layer";
import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { CellClickableItem, clickableCellRegistry } from "../../registries/cell_clickable_registry";
import { Command } from "../../types/commands";
import { CellPosition, UID } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export interface ClickableCell {
  coordinates: Rect;
  position: CellPosition;
  title: string;
  action: (position: CellPosition, env: SpreadsheetActionEnv, isMiddleClick?: boolean) => void;
  component: ComponentConstructor | undefined;
  componentProps: Record<string, unknown>;
}

export class ClickableCellsPlugin extends OwlPluginWithModel {
  private viewPlugin = usePlugin(ViewportsPlugin);
  private _clickableCells: Record<UID, Record<string, CellClickableItem | undefined>> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this._clickableCells = {};
    }
  }

  private getClickableItem(
    position: CellPosition,
    registryItems: CellClickableItem[]
  ): CellClickableItem | undefined {
    const { sheetId, col, row } = position;
    const clickableCells = this._clickableCells;
    const xc = toXC(col, row);
    if (!clickableCells[sheetId]) {
      clickableCells[sheetId] = {};
    }
    if (!(xc in clickableCells[sheetId]!)) {
      const clickableCell = this.findClickableItem(position, registryItems);
      clickableCells[sheetId][xc] = clickableCell;
    }
    return clickableCells[sheetId][xc];
  }

  private findClickableItem(position: CellPosition, registryItems: CellClickableItem[]) {
    const getters = this.model().getters;
    for (const item of registryItems) {
      if (item.condition(position, getters)) {
        return item;
      }
    }
    return undefined;
  }

  get clickableCells(): ClickableCell[] {
    const cells: ClickableCell[] = [];
    const getters = this.model().getters;
    const registryItems = clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
    for (const position of this.viewPlugin.visibleCellPositions) {
      const item = this.getClickableItem(position, registryItems);
      if (!item) {
        continue;
      }
      const title = typeof item.title === "function" ? item.title(position, getters) : item.title;
      const rect = this.getClickableCellRect(position);
      if (!rect) {
        continue;
      }
      cells.push({
        coordinates: rect,
        position,
        action: item.execute,
        title: title || "",
        component: item.component,
        componentProps: item.componentProps?.(position, getters) ?? {},
      });
    }
    return cells;
  }

  private getClickableCellRect(position: CellPosition): Rect | undefined {
    const getters = this.model().getters;
    const zone = getters.expandZone(position.sheetId, positionToZone(position));
    const clickableRect = this.viewPlugin.viewports().getVisibleRect(position.sheetId, zone);

    const icons = getters.getCellIcons(position);
    const iconsAtPosition = {
      center: icons.find((icon) => icon.horizontalAlign === "center"),
      left: icons.find((icon) => icon.horizontalAlign === "left"),
      right: icons.find((icon) => icon.horizontalAlign === "right"),
    };
    if (iconsAtPosition.center?.onClick) {
      return undefined;
    }
    if (iconsAtPosition.right?.onClick) {
      const cellRect = this.viewPlugin.viewports().getRect(position.sheetId, zone);
      const iconRect = getters.getCellIconRect(iconsAtPosition.right, cellRect);
      clickableRect.width -= iconRect.width + iconsAtPosition.right.margin;
    }
    if (iconsAtPosition.left?.onClick) {
      const cellRect = this.viewPlugin.viewports().getRect(position.sheetId, zone);
      const iconRect = getters.getCellIconRect(iconsAtPosition.left, cellRect);
      clickableRect.x += iconRect.width + iconsAtPosition.left.margin;
      clickableRect.width -= iconRect.width + iconsAtPosition.left.margin;
    }

    return clickableRect;
  }
}
