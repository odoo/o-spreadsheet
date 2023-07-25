import { CELL_DELETED_MESSAGE } from "../../plugins/ui_stateful";
import { _lt } from "../../translation";
import { CommandResult, SpreadsheetChildEnv } from "../../types";

export function interactiveStopEdition(env: SpreadsheetChildEnv, cancel: boolean = false) {
  const result = env.model.dispatch("STOP_EDITION", { cancel });
  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.InvalidComposerCell)) {
      env.raiseError(_lt(CELL_DELETED_MESSAGE), () => {
        env.model.dispatch("STOP_EDITION", { cancel: true });
      });
    }
  }
}
