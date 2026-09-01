import { FORBIDDEN_SHEETNAME_CHARS } from "../../constants";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { UID } from "../../types/misc";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export function interactiveRenameSheet(
  env: SpreadsheetActionEnv,
  sheetId: UID,
  name: string,
  errorCallback: () => void
) {
  const notificationPlugin = env.getPlugin(NotificationPlugin);
  const result = env.model.dispatch("RENAME_SHEET", {
    sheetId,
    newName: name,
    oldName: env.model.getters.getSheetName(sheetId),
  });
  if (result.reasons.includes(CommandResult.MissingSheetName)) {
    notificationPlugin.raiseError(_t("The sheet name cannot be empty."), errorCallback);
  } else if (result.reasons.includes(CommandResult.DuplicatedSheetName)) {
    notificationPlugin.raiseError(
      _t("A sheet with the name %s already exists. Please select another name.", name),
      errorCallback
    );
  } else if (result.reasons.includes(CommandResult.ForbiddenCharactersInSheetName)) {
    notificationPlugin.raiseError(
      _t(
        "Some used characters are not allowed in a sheet name (Forbidden characters are %s).",
        FORBIDDEN_SHEETNAME_CHARS.join(" ")
      ),
      errorCallback
    );
  }
}
