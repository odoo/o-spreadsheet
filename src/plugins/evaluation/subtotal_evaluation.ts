import { EvaluationCommand, invalidSubtotalFormulasCommands } from "../../types/commands";
import { EvaluationPlugin } from "../evaluation_plugin";

export class SubtotalEvaluationPlugin extends EvaluationPlugin {
  handlers = {
    UPDATE_TABLE: this.invalidateSubtotalFormulas,
    UPDATE_FILTER: this.invalidateSubtotalFormulas,
    HIDE_COLUMNS_ROWS: this.invalidateSubtotalFormulas,
    UNHIDE_COLUMNS_ROWS: this.invalidateSubtotalFormulas,
    GROUP_HEADERS: this.invalidateSubtotalFormulas,
    UNGROUP_HEADERS: this.invalidateSubtotalFormulas,
    FOLD_HEADER_GROUP: this.invalidateSubtotalFormulas,
    UNFOLD_HEADER_GROUP: this.invalidateSubtotalFormulas,
    FOLD_ALL_HEADER_GROUPS: this.invalidateSubtotalFormulas,
    UNFOLD_ALL_HEADER_GROUPS: this.invalidateSubtotalFormulas,
  };

  private invalidateSubtotalFormulas() {
    this.dispatch("EVALUATE_CELLS", {
      cellIds: this.getters.getCellsWithTrackedFormula("SUBTOTAL"),
    });
  }

  handle(cmd: EvaluationCommand) {
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.invalidateSubtotalFormulas();
    }
  }
}
