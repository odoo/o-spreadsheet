import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { UID, Zone } from "../../types/misc";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export const AddMergeInteractiveContent = {
  MergeIsDestructive: _t(
    "Merging these cells will only preserve the top-leftmost value. Merge anyway?"
  ),
  MergeInFilter: _t("You can't merge cells inside of an existing filter."),
};

export function interactiveAddMerge(env: SpreadsheetActionEnv, sheetId: UID, target: Zone[]) {
  const notificationPlugin = env.getPlugin(NotificationPlugin);
  const result = env.model.dispatch("ADD_MERGE", { sheetId, target });
  if (result.isCancelledBecause(CommandResult.MergeInTable)) {
    notificationPlugin.raiseError(AddMergeInteractiveContent.MergeInFilter);
  } else if (result.isCancelledBecause(CommandResult.MergeIsDestructive)) {
    notificationPlugin.askConfirmation(AddMergeInteractiveContent.MergeIsDestructive, () => {
      env.model.dispatch("ADD_MERGE", { sheetId, target, force: true });
    });
  }
}
