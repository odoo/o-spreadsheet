import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { CommandResult } from "../../types";
import { SpreadsheetChildEnv } from "../../types/spreadsheetChildEnv";

export function interactiveCut(env: SpreadsheetChildEnv) {
  const result = env.model.dispatch("CUT");

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.raiseError(_t("This operation is not allowed with multiple selections."));
    }
  }
}
