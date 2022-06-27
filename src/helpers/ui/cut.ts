import { CommandResult } from "../..";
import { _lt } from "../../translation";
import { SpreadsheetChildEnv } from "../../types";

export function interactiveCut(env: SpreadsheetChildEnv) {
  const result = env.model.dispatch("CUT");

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.notifyUser(_lt("This operation is not allowed with multiple selections."));
    }
  }
}
