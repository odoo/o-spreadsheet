import { _t } from "../../translation";
import { CommandResult, DispatchResult } from "../../types/commands";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export const SplitToColumnsInteractiveContent = {
  SplitIsDestructive: _t("This will overwrite data in the subsequent columns. Split anyway?"),
};

export function interactiveSplitToColumns(
  env: SpreadsheetChildEnv,
  separator: string,
  addNewColumns: boolean
): DispatchResult {
  const sheetId = env.model.getters.getActiveSheetId();
  const zone = env.model.getters.getSelectedZone();

  let result = env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", {
    separator,
    addNewColumns,
    sheetId,
    zone,
  });
  if (result.isCancelledBecause(CommandResult.SplitWillOverwriteContent)) {
    env.askConfirmation(SplitToColumnsInteractiveContent.SplitIsDestructive, () => {
      result = env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", {
        separator,
        addNewColumns,
        force: true,
        sheetId,
        zone,
      });
    });
  }
  return result;
}
