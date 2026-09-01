import { EvaluationCommand, invalidSubtotalFormulasCommands } from "../../types/commands";
import { EvaluationPlugin } from "../evaluation_plugin";

export class SubtotalEvaluationPlugin extends EvaluationPlugin {
  handle(cmd: EvaluationCommand) {
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", {
        cellIds: this.getters.getCellsWithTrackedFormula("SUBTOTAL"),
      });
    }
  }
}
