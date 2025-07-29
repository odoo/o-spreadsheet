import { recomputeZones } from "../../helpers";
import { Cell, Command, invalidSubtotalFormulasCommands } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class SubtotalEvaluationPlugin extends UIPlugin {
  private subtotalCells: Set<string> = new Set(); // store cells containing subtotals tokens in their formulas content

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START": {
        this.subtotalCells.clear();
        for (const sheetId of this.getters.getSheetIds()) {
          for (const cell of Object.values(this.getters.getCells(sheetId))) {
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
      case "CLEAR_CELL": {
        const cell = this.getters.getCell(cmd);
        if (!cell) return;
        this.subtotalCells.delete(cell.id);
        break;
      }
      case "CLEAR_CELLS":
      case "DELETE_CONTENT": {
        for (const zone of recomputeZones(cmd.target)) {
          for (let col = zone.left; col <= zone.right; col++) {
            for (let row = zone.top; row <= zone.bottom; row++) {
              const cell = this.getters.getCell({ sheetId: cmd.sheetId, col, row });
              if (!cell) continue;
              this.subtotalCells.delete(cell.id);
            }
          }
        }
        break;
      }
    }
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", { cellIds: Array.from(this.subtotalCells) });
    }
  }
}

function isSubtotalCell(cell: Cell): boolean {
  return (
    cell.isFormula &&
    cell.compiledFormula.tokens.some(
      (t) => t.type === "SYMBOL" && t.value.toUpperCase() === "SUBTOTAL"
    )
  );
}
