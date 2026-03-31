<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { Command, invalidSubtotalFormulasCommands } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class SubtotalEvaluationPlugin extends UIPlugin {
  handle(cmd: Command) {
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", {
        cellIds: this.getters.getCellsWithTrackedFormula("SUBTOTAL"),
      });
    }
  }
}
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
import { Cell } from "../../types/cells";
import { Command, invalidSubtotalFormulasCommands } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class SubtotalEvaluationPlugin extends UIPlugin {
  private subtotalCells: Set<string> = new Set();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START": {
        this.subtotalCells.clear();
        for (const sheetId of this.getters.getSheetIds()) {
          const cells = this.getters.getCells(sheetId);
          for (const cellId in cells) {
            const cell = cells[cellId];
            if (isSubtotalCell(cell)) {
              this.subtotalCells.add(cell.id);
            }
          }
        }
        break;
      }
      case "UPDATE_CELL": {
        if (!("content" in cmd)) return;
        const cell = this.getters.getCell(cmd);
        if (!cell) return;
        if (isSubtotalCell(cell)) {
          this.subtotalCells.add(cell.id);
        } else {
          this.subtotalCells.delete(cell.id);
        }
        break;
      }
    }
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", { cellIds: Array.from(this.subtotalCells) });
    }
  }
}

export function isSubtotalCell(cell: Cell): boolean {
  return (
    cell.isFormula &&
    cell.compiledFormula.tokens.some(
      (t) => t.type === "SYMBOL" && t.value.toUpperCase() === "SUBTOTAL"
    )
  );
}
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
