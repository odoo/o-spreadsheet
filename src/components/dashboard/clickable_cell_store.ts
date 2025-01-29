import { markRaw } from "@odoo/owl";
import { positionToZone, toXC } from "../../helpers";
import { CellClickableItem, clickableCellRegistry } from "../../registries/cell_clickable_registry";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import {
  CellPosition,
  Command,
  Rect,
  SpreadsheetChildEnv,
  UID,
  invalidateEvaluationCommands,
} from "../../types";

export interface ClickableCell {
  coordinates: Rect;
  position: CellPosition;
  title: string;
  action: (position: CellPosition, env: SpreadsheetChildEnv) => void;
}

export class ClickableCellsStore extends SpreadsheetStore {
  private _clickableCells: Record<UID, Record<string, CellClickableItem>> = markRaw({});
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
      if (clickableCell) {
        clickableCells[sheetId][xc] = clickableCell;
      }
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
    const sheetId = getters.getActiveSheetId();
    for (const position of this.getters.getVisibleCellPositions()) {
      const item = this.getClickableItem(position);
      if (!item) {
        continue;
      }
      const zone = getters.expandZone(sheetId, positionToZone(position));
      cells.push({
        coordinates: getters.getVisibleRect(zone),
        position,
        action: item.execute,
        title: item.title || "",
      });
    }
    return cells;
  }
}
