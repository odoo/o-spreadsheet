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

type Garbage = ((position: CellPosition, env: SpreadsheetChildEnv) => void) | false;

export interface ClickableCell {
  coordinates: Rect;
  position: CellPosition;
  action: (position: CellPosition, env: SpreadsheetChildEnv) => void;
}

export class ClickableCellsStore extends SpreadsheetStore {
  private _clickableCells: Record<UID, Record<string, Garbage>> = markRaw({});
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

  private getClickableAction(position: CellPosition): Garbage {
    const { sheetId, col, row } = position;
    const clickableCells = this._clickableCells;
    const xc = toXC(col, row);
    if (!clickableCells[sheetId]) {
      clickableCells[sheetId] = {};
    }
    if (!(xc in clickableCells[sheetId]!)) {
      clickableCells[sheetId][xc] = this.findClickableAction(position);
    }
    return clickableCells[sheetId][xc];
  }

  private findClickableAction(position: CellPosition) {
    const getters = this.getters;
    for (const item of this._registryItems) {
      if (item.condition(position, getters)) {
        return item.execute;
      }
    }
    return false;
  }

  get clickableCells(): ClickableCell[] {
    const cells: ClickableCell[] = [];
    const getters = this.getters;
    const sheetId = getters.getActiveSheetId();
    for (const col of getters.getSheetViewVisibleCols()) {
      for (const row of getters.getSheetViewVisibleRows()) {
        const position = { sheetId, col, row };
        if (!getters.isMainCellPosition(position)) {
          continue;
        }
        const action = this.getClickableAction(position);
        if (!action) {
          continue;
        }
        const zone = getters.expandZone(sheetId, positionToZone(position));
        cells.push({
          coordinates: getters.getVisibleRect(zone),
          position,
          action,
        });
      }
    }
    return cells;
  }
}
