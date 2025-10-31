import { doesCellContainFunction } from "../../helpers";
import { Command } from "../../types/commands";
import { UID } from "../../types/misc";
import { CoreViewPlugin } from "../core_view_plugin";

const trackedFormulas = ["SUBTOTAL", "PIVOT"];

export class FormulaTrackerPlugin extends CoreViewPlugin {
  static getters = ["getCellsWithTrackedFormula"] as const;

  private trackedCells: Record<string, Record<UID, boolean | undefined>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START": {
        for (const formula of trackedFormulas) {
          this.trackedCells[formula] = {};
        }
        for (const sheetId of this.getters.getSheetIds()) {
          const cells = this.getters.getCells(sheetId);
          for (const cellId in cells) {
            const cell = cells[cellId];
            for (const formula of trackedFormulas) {
              if (doesCellContainFunction(cell, formula)) {
                this.history.update("trackedCells", formula, cell.id, true);
              }
            }
          }
        }
        break;
      }
      case "UPDATE_CELL": {
        if (!("content" in cmd)) {
          return;
        }
        const cell = this.getters.getCell(cmd);
        // We don't update `this.trackedCells` and rely on `getCellsWithTrackedFormula` filtering out non-existing cells.
        // We cannot store the id in the beforeHandle, because the cell is already deleted in the beforeHandle of the sheet plugin
        if (!cell) {
          return;
        }
        for (const formula of trackedFormulas) {
          if (doesCellContainFunction(cell, formula)) {
            this.history.update("trackedCells", formula, cell.id, true);
          } else if (this.trackedCells[formula][cell.id]) {
            this.history.update("trackedCells", formula, cell.id, undefined);
          }
        }
        break;
      }
    }
  }

  getCellsWithTrackedFormula(formula: string): string[] {
    return Object.keys(this.trackedCells[formula] || {}).filter(
      (cellId) => this.trackedCells[formula][cellId] && this.getters.tryGetCellPosition(cellId)
    );
  }
}
