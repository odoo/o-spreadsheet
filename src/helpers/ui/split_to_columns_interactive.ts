import { SplitToColumnsStore } from "../../plugins/ui_feature/split_to_columns";
import { _t } from "../../translation";
import { CommandResult, DispatchResult } from "../../types/commands";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export const SplitToColumnsInteractiveContent = {
  SplitIsDestructive: _t("This will overwrite data in the subsequent columns. Split anyway?"),
};

export function interactiveSplitToColumns(env: SpreadsheetChildEnv): DispatchResult {
  const store = env.getStore(SplitToColumnsStore);
  let result = store.canSplitIntoColumns({ force: false });
  if (result.isCancelledBecause(CommandResult.SplitWillOverwriteContent)) {
    env.askConfirmation(SplitToColumnsInteractiveContent.SplitIsDestructive, () => {
      result = env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", { force: true });
    });
  } else {
    result = env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", { force: false });
  }
  return result;
}
