import { CELL_DELETED_MESSAGE, ComposerSelection } from "../../plugins/ui_stateful";
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

export function interactiveSetContent(
  env: SpreadsheetChildEnv,
  content: string,
  selection?: ComposerSelection
) {
  const result = env.model.dispatch("SET_CURRENT_CONTENT", { content, selection });
  if (result.isSuccessful && env.model.getters.getCurrentTokens().length > 100) {
    env.raiseError(
      _lt(
        "This formula has over 100 parts. It can't be processed properly, consider splitting it into multiple cells."
      )
    );
  }
}
