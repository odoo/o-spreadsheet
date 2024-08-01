import { _t } from "../../translation";
import type { SpreadsheetChildEnv, UID, Zone } from "../../types";
import { CommandResult } from "../../types";

export const AddFilterInteractiveContent = {
  filterOverlap: _t("You cannot create overlapping filters."),
  nonContinuousTargets: _t("A filter can only be created on a continuous selection."),
  mergeInFilter: _t("You can't create a filter over a range that contains a merge."),
};

export function interactiveAddFilter(env: SpreadsheetChildEnv, sheetId: UID, target: Zone[]) {
  const result = env.model.dispatch("CREATE_FILTER_TABLE", { target, sheetId });
  if (result.isCancelledBecause(CommandResult.FilterOverlap)) {
    env.raiseError(AddFilterInteractiveContent.filterOverlap);
  } else if (result.isCancelledBecause(CommandResult.MergeInFilter)) {
    env.raiseError(AddFilterInteractiveContent.mergeInFilter);
  } else if (result.isCancelledBecause(CommandResult.NonContinuousTargets)) {
    env.raiseError(AddFilterInteractiveContent.nonContinuousTargets);
  }
}
