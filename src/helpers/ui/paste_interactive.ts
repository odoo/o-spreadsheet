import { CommandResult, DispatchResult } from "../..";
import { _lt } from "../../translation";
import { ClipboardPasteOptions, SpreadsheetChildEnv, Zone } from "../../types";

export const PasteInteractiveContent = {
  wrongPasteSelection: _lt("This operation is not allowed with multiple selections."),
  willRemoveExistingMerge: _lt(
    "This operation is not possible due to a merge. Please remove the merges first than try again."
  ),
  wrongFigurePasteOption: _lt("Cannot do a special paste of a figure."),
};

export function handlePasteResult(env: SpreadsheetChildEnv, result: DispatchResult) {
  if (!result.isSuccessful) {
    if (result.reasons.includes(CommandResult.WrongPasteSelection)) {
      env.notifyUser(PasteInteractiveContent.wrongPasteSelection);
    } else if (result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
      env.notifyUser(PasteInteractiveContent.willRemoveExistingMerge);
    } else if (result.reasons.includes(CommandResult.WrongFigurePasteOption)) {
      env.notifyUser(PasteInteractiveContent.wrongFigurePasteOption);
    }
  }
}

export function interactivePaste(
  env: SpreadsheetChildEnv,
  target: Zone[],
  pasteOption?: ClipboardPasteOptions
) {
  const result = env.model.dispatch("PASTE", { target, pasteOption });
  handlePasteResult(env, result);
}
