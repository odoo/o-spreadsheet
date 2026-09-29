import { EvaluationPlugin } from "../evaluation_plugin";

export class SubtotalEvaluationPlugin extends EvaluationPlugin {
  handlers = {
    "*invalidSubtotalFormulasCommands": this.invalidateSubtotalFormulas,
  };

  private invalidateSubtotalFormulas() {
    this.dispatch("EVALUATE_CELLS", {
      cellIds: this.getters.getCellsWithTrackedFormula("SUBTOTAL"),
    });
  }
}
