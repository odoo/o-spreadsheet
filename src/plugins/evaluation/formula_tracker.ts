import { doesCellContainFunction } from "../../helpers/misc";
import { UpdateCellCommand } from "../../types/commands";
import { UID } from "../../types/misc";
import { EvaluationPlugin } from "../evaluation_plugin";

const trackedFormulas = ["SUBTOTAL", "PIVOT"];

export class FormulaTrackerPlugin extends EvaluationPlugin {
  static getters = ["getCellsWithTrackedFormula"] as const;

  private trackedCells: Record<string, Record<UID, number | undefined>> = {};

  handlers = {
    UPDATE_CELL: this.onUpdateCell,
    START: this.onStart,
  };

  private onStart() {
    for (const formula of trackedFormulas) {
      this.trackedCells[formula] = {};
    }
    for (const sheetId of this.getters.getSheetIds()) {
      for (const cell of this.getters.getCells(sheetId)) {
        for (const formula of trackedFormulas) {
          if (doesCellContainFunction(cell, formula)) {
            this.history.update("trackedCells", formula, cell.id, cell.id);
          }
        }
      }
    }
  }

  private onUpdateCell(cmd: UpdateCellCommand) {
    if (!("content" in cmd)) {
      return;
    }
    const cell = this.getters.getCell(cmd);
    // We don't update `this.trackedCells` and rely on `getCellsWithTrackedFormula` filtering out non-existing cells.
    // We cannot store the id in a pre-handler, because the cell is already deleted in the pre-handler of the sheet plugin
    if (!cell) {
      return;
    }
    for (const formula of trackedFormulas) {
      if (doesCellContainFunction(cell, formula)) {
        this.history.update("trackedCells", formula, cell.id, cell.id);
      } else if (this.trackedCells[formula][cell.id]) {
        this.history.update("trackedCells", formula, cell.id, undefined);
      }
    }
  }

  getCellsWithTrackedFormula(formula: string): number[] {
    return Object.values(this.trackedCells[formula] || {}).filter(
      (cellId): cellId is number =>
        cellId !== undefined &&
        this.trackedCells[formula][cellId] &&
        this.getters.tryGetCellPosition(cellId)
    );
  }
}
