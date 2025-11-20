import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ComponentConstructor, markRaw } from "@odoo/owl";
import { positionToZone, toXC } from "../../helpers";
import { CellClickableItem, clickableCellRegistry } from "../../registries/cell_clickable_registry";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { CellPosition, Command, Rect, UID, invalidateEvaluationCommands } from "../../types";

export interface ClickableCell {
  coordinates: Rect;
  position: CellPosition;
  title: string;
  action: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) => void;
  component: ComponentConstructor | undefined;
  componentProps: Record<string, unknown>;
}

export class ClickableCellsStore extends SpreadsheetStore {
  private _clickableCells: Record<UID, Record<string, CellClickableItem | undefined>> = markRaw({});
  private _registryItems: CellClickableItem[] = markRaw(
    clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence)
  );

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this._clickableCells = markRaw({});
      this._registryItems = markRaw(
        clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence)
      );
    }
  }

  private getClickableItem(position: CellPosition): CellClickableItem | undefined {
    const { sheetId, col, row } = position;
    const clickableCells = this._clickableCells;
    const xc = toXC(col, row);
    if (!clickableCells[sheetId]) {
      clickableCells[sheetId] = {};
    }
    if (!(xc in clickableCells[sheetId]!)) {
      const clickableCell = this.findClickableItem(position);
      clickableCells[sheetId][xc] = clickableCell;
    }
    return clickableCells[sheetId][xc];
  }

  private findClickableItem(position: CellPosition) {
    const getters = this.getters;
    for (const item of this._registryItems) {
      if (item.condition(position, getters)) {
        return item;
      }
    }
    return undefined;
  }

  get clickableCells(): ClickableCell[] {
    const cells: ClickableCell[] = [];
    const getters = this.getters;
    for (const position of this.getters.getVisibleCellPositions()) {
      const item = this.getClickableItem(position);
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
    const zone = this.getters.expandZone(position.sheetId, positionToZone(position));
    const clickableRect = this.getters.getVisibleRect(zone);

    const icons = this.getters.getCellIcons(position);
    const iconsAtPosition = {
      center: icons.find((icon) => icon.horizontalAlign === "center"),
      left: icons.find((icon) => icon.horizontalAlign === "left"),
      right: icons.find((icon) => icon.horizontalAlign === "right"),
    };
    if (iconsAtPosition.center?.onClick) {
      return undefined;
    }
    if (iconsAtPosition.right?.onClick) {
      const cellRect = this.getters.getRect(zone);
      const iconRect = this.getters.getCellIconRect(iconsAtPosition.right, cellRect);
      clickableRect.width -= iconRect.width + iconsAtPosition.right.margin;
    }
    if (iconsAtPosition.left?.onClick) {
      const cellRect = this.getters.getRect(zone);
      const iconRect = this.getters.getCellIconRect(iconsAtPosition.left, cellRect);
      clickableRect.x += iconRect.width + iconsAtPosition.left.margin;
      clickableRect.width -= iconRect.width + iconsAtPosition.left.margin;
    }

    return clickableRect;
  }
}
