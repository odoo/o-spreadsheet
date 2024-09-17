import { _t } from "../../translation";
import { CommandResult, SpreadsheetChildEnv, UID, Zone } from "../../types";

export const AddMergeInteractiveContent = {
  MergeIsDestructive: _t(
    "Merging these cells will only preserve the top-leftmost value. Merge anyway?"
  ),
  MergeInFilter: _t("You can't merge cells inside of an existing filter."),
};

export function interactiveAddMerge(env: SpreadsheetChildEnv, sheetId: UID, target: Zone[]) {
  const result = env.model.dispatch("ADD_MERGE", { sheetId, target });
  if (result.isCancelledBecause(CommandResult.MergeInTable)) {
    env.raiseError(AddMergeInteractiveContent.MergeInFilter);
  } else if (result.isCancelledBecause(CommandResult.MergeIsDestructive)) {
    env.askConfirmation(AddMergeInteractiveContent.MergeIsDestructive, () => {
      env.model.dispatch("ADD_MERGE", { sheetId, target, force: true });
    });
  }
}
