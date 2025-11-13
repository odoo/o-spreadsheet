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
