import { dataValidationEvaluatorRegistry } from "../../registries/data_validation_registry";
import { _t } from "../../translation";
import type { SpreadsheetChildEnv } from "../../types";
import { CommandResult } from "../../types";
import { toXC } from "../coordinates";

export function interactiveStopEdition(env: SpreadsheetChildEnv) {
  const result = env.model.dispatch("STOP_EDITION");
  if (result.isCancelledBecause(CommandResult.BlockingValidationRule)) {
    const editedCell = env.model.getters.getCurrentEditedCell();
    const cellXc = toXC(editedCell.col, editedCell.row);

    const rule = env.model.getters.getValidationRuleForCell(editedCell);
    if (!rule) {
      return;
    }

    const evaluator = dataValidationEvaluatorRegistry.get(rule.criterion.type);
    const errorStr = evaluator.getErrorString(
      rule.criterion,
      env.model.getters,
      editedCell.sheetId
    );
    env.raiseError(
      _t(
        "The data you entered in %s violates the data validation rule set on the cell:\n%s",
        cellXc,
        errorStr
      )
    );
    env.model.dispatch("CANCEL_EDITION");
  }
}
