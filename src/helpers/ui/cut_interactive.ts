import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { ClipboardStore } from "../../stores/clipboard_store";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export function interactiveCut(env: SpreadsheetActionEnv) {
  const clipboardStore = env.getStore(ClipboardStore);
  const result = clipboardStore.isCommandValid({ type: "CUT" });

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env
        .getPlugin(NotificationPlugin)
        .raiseError(_t("This operation is not allowed with multiple selections."));
    }
  } else {
    env.model.dispatch("CUT");
  }
}
