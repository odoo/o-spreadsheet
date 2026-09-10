import { SplitToColumnsStore } from "../../components/side_panel/split_to_columns_panel/split_to_columns_store";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import { CommandResult, DispatchResult } from "../../types/commands";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export const SplitToColumnsInteractiveContent = {
  SplitIsDestructive: _t("This will overwrite data in the subsequent columns. Split anyway?"),
};

export function interactiveSplitToColumns(env: SpreadsheetActionEnv): DispatchResult {
  const store = env.getStore(SplitToColumnsStore);
  let result = store.canSplitIntoColumns({ force: false });
  if (result.isCancelledBecause(CommandResult.SplitWillOverwriteContent)) {
    env
      .getPlugin(NotificationPlugin)
      .askConfirmation(SplitToColumnsInteractiveContent.SplitIsDestructive, () => {
        result = env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", { force: true });
      });
  } else {
    result = env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", { force: false });
  }
  return result;
}
