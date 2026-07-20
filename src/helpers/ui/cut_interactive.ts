import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function interactiveCut(env: SpreadsheetChildEnv) {
  const sheetId = env.model.getters.getActiveSheetId();
  const target = env.model.getters.getSelectedZones();
  const result = env.model.dispatch("CUT", { sheetId, target });

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.raiseError(_t("This operation is not allowed with multiple selections."));
    }
  }
}
