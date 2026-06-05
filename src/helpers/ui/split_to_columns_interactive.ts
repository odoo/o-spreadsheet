import { Model } from "../../model";
import { _t } from "../../translation";
import { CommandResult, DispatchResult } from "../../types/commands";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export const SplitToColumnsInteractiveContent = {
  SplitIsDestructive: _t("This will overwrite data in the subsequent columns. Split anyway?"),
};

export function interactiveSplitToColumns(
  model: Model,
  env: SpreadsheetChildEnv,
  separator: string,
  addNewColumns: boolean
): DispatchResult {
  let result = model.dispatch("SPLIT_TEXT_INTO_COLUMNS", { separator, addNewColumns });
  if (result.isCancelledBecause(CommandResult.SplitWillOverwriteContent)) {
    env.askConfirmation(SplitToColumnsInteractiveContent.SplitIsDestructive, () => {
      result = model.dispatch("SPLIT_TEXT_INTO_COLUMNS", {
        separator,
        addNewColumns,
        force: true,
      });
    });
  }
  return result;
}
