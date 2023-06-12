import { CommandResult, DispatchResult } from "../..";
import { _lt } from "../../translation";
import { ClipboardPasteOptions, SpreadsheetChildEnv, Zone } from "../../types";

export const PasteInteractiveContent = {
  wrongPasteSelection: _lt("This operation is not allowed with multiple selections."),
  willRemoveExistingMerge: _lt(
    "This operation is not possible due to a merge. Please remove the merges first than try again."
  ),
  wrongFigurePasteOption: _lt("Cannot do a special paste of a figure."),
  frozenPaneOverlap: _lt("Cannot paste merged cells over a frozen pane."),
};

export function handlePasteResult(env: SpreadsheetChildEnv, result: DispatchResult) {
  if (!result.isSuccessful) {
    if (result.reasons.includes(CommandResult.WrongPasteSelection)) {
      env.raiseError(PasteInteractiveContent.wrongPasteSelection);
    } else if (result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
      env.raiseError(PasteInteractiveContent.willRemoveExistingMerge);
    } else if (result.reasons.includes(CommandResult.WrongFigurePasteOption)) {
      env.raiseError(PasteInteractiveContent.wrongFigurePasteOption);
    } else if (result.reasons.includes(CommandResult.FrozenPaneOverlap)) {
      env.raiseError(PasteInteractiveContent.frozenPaneOverlap);
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

export function interactivePasteFromOS(
  env: SpreadsheetChildEnv,
  target: Zone[],
  text: string,
  pasteOption?: ClipboardPasteOptions
) {
  const result = env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", { target, text, pasteOption });
  handlePasteResult(env, result);
}
