import { CommandResult } from "../..";
import { _lt } from "../../translation";
import { SpreadsheetChildEnv, Zone } from "../../types";

export function interactiveCut(env: SpreadsheetChildEnv, target: Zone[]) {
  const result = env.model.dispatch("CUT", { target });

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.notifyUser(_lt("This operation is not allowed with multiple selections."));
    }
  }
}
