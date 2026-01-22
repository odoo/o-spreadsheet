import { Command } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class UIOptionsPlugin extends UIPlugin {
  static getters = ["shouldShowFormulas", "isAutomaticEvaluationEnabled"] as const;
  private showFormulas: boolean = false;
  private automaticEvaluation: boolean = true;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
      case "SET_AUTOMATIC_EVALUATION":
        const wasDisabled = !this.automaticEvaluation;
        this.automaticEvaluation = cmd.enabled;
        // When re-enabling automatic evaluation, trigger a full evaluation
        // to update all cells, charts, pivots, etc. that may have changed
        if (wasDisabled && cmd.enabled) {
          this.dispatch("EVALUATE_CELLS");
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  isAutomaticEvaluationEnabled(): boolean {
    return this.automaticEvaluation;
  }
}
