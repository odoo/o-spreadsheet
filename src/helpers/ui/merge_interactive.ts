import { Model } from "../../model";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { UID, Zone } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export const AddMergeInteractiveContent = {
  MergeIsDestructive: _t(
    "Merging these cells will only preserve the top-leftmost value. Merge anyway?"
  ),
  MergeInFilter: _t("You can't merge cells inside of an existing filter."),
};

export function interactiveAddMerge(
  model: Model,
  env: SpreadsheetChildEnv,
  sheetId: UID,
  target: Zone[]
) {
  const result = model.dispatch("ADD_MERGE", { sheetId, target });
  if (result.isCancelledBecause(CommandResult.MergeInTable)) {
    env.raiseError(AddMergeInteractiveContent.MergeInFilter);
  } else if (result.isCancelledBecause(CommandResult.MergeIsDestructive)) {
    env.askConfirmation(AddMergeInteractiveContent.MergeIsDestructive, () => {
      model.dispatch("ADD_MERGE", { sheetId, target, force: true });
    });
  }
}
