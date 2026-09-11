import { EvaluationCommand, invalidSubtotalFormulasCommands } from "../../types/commands";
import { EvaluationPlugin } from "../evaluation_plugin";

export class SubtotalEvaluationPlugin extends EvaluationPlugin {
  handle(cmd: EvaluationCommand) {
    if (!this.getters.isAutomaticEvaluationEnabled()) {
      // dispatching EVALUATE_CELLS here would evaluate the entire spreadsheet:
      // the cellIds are ignored when the automatic evaluation is disabled, and a
      // full rebuild is performed instead. The SUBTOTAL formulas are left
      // outdated, like any other formula, until the next explicit evaluation.
      return;
    }
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", {
        cellIds: this.getters.getCellsWithTrackedFormula("SUBTOTAL"),
      });
    }
  }
}
