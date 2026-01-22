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
        this.automaticEvaluation = cmd.enabled;
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
