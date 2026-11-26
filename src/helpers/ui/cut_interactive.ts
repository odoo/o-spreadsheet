import { ClipboardPlugin } from "../../owl_plugins/clipboard_owl_plugin";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export function interactiveCut(env: SpreadsheetActionEnv) {
  const clipboardPlugin = env.getPlugin(ClipboardPlugin);
  const result = clipboardPlugin.isCommandValid({ type: "CUT" });

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env
        .getPlugin(NotificationPlugin)
        .raiseError(_t("This operation is not allowed with multiple selections."));
    }
  } else {
    env.model().dispatch("CUT");
  }
}
