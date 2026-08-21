import { Command, invalidSubtotalFormulasCommands } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

// Fixme: this should be an evaluationPlugin, but we cannot do that because
// the evaluation plugins cannot dispatch for now
export class SubtotalEvaluationPlugin extends UIPlugin {
  handle(cmd: Command) {
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", {
        cellIds: this.getters.getCellsWithTrackedFormula("SUBTOTAL"),
      });
    }
  }
}
