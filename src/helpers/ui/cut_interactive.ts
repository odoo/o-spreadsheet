import { ClipboardStore } from "../../stores/clipboard_store";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function interactiveCut(env: SpreadsheetChildEnv) {
  const clipboardStore = env.getStore(ClipboardStore);
  const result = clipboardStore.isCommandValid({ type: "CUT" });

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env.raiseError(_t("This operation is not allowed with multiple selections."));
    }
  } else {
    env.model.dispatch("CUT");
  }
}
