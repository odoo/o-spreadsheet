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
        if (!("content" in cmd)) {
          return;
        }
        const cell = this.getters.getCell(cmd);
        if (!cell) {
          return;
        }
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
