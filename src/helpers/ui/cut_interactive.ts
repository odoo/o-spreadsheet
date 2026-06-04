import { Model } from "../../model";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function interactiveCut(model: Model, env: SpreadsheetChildEnv) {
  const result = model.dispatch("CUT");

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.raiseError(_t("This operation is not allowed with multiple selections."));
    }
  }
}
