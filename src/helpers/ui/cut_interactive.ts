import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export function interactiveCut(env: SpreadsheetActionEnv) {
  const result = env.model.dispatch("CUT");

  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.WrongCutSelection)) {
      env
        .getPlugin(NotificationPlugin)
        .raiseError(_t("This operation is not allowed with multiple selections."));
    }
  }
}
