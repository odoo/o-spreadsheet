import { doesCellContainFormula } from "../../helpers";
import { Command } from "../../types/commands";
import { CoreViewPlugin } from "../core_view_plugin";

const trackedFormulas = ["SUBTOTAL", "PIVOT"];

export class FormulaTrackerPlugin extends CoreViewPlugin {
  static getters = ["getCellsWithTrackedFormula"] as const;

  private trackedCells: Record<string, Record<string, boolean | undefined>> = {};

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
              if (doesCellContainFormula(cell, formula)) {
                this.history.update("trackedCells", formula, cell.id, true);
              }
            }
          }
        }
        break;
      }
      case "UPDATE_CELL": {
        if (!("content" in cmd)) return;
        const cell = this.getters.getCell(cmd);
        if (!cell) return;
        for (const formula of trackedFormulas) {
          if (doesCellContainFormula(cell, formula)) {
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
