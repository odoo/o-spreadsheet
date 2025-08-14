import { _t } from "../../translation";
import { CommandResult, SpreadsheetChildEnv } from "../../types";

export function interactiveCut(env: SpreadsheetChildEnv) {
  const result = env.model.dispatch("CUT");

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.raiseError(_t("This operation is not allowed with multiple selections."));
    }
  }
}
