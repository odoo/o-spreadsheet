import { CURRENT_VERSION } from "../../migrations/data";
import { _t } from "../../translation";
import {
  ClipboardPasteOptions,
  CommandResult,
  DispatchResult,
  ParsedOSClipboardContent,
  SpreadsheetChildEnv,
  Zone,
} from "../../types";

export const PasteInteractiveContent = {
  wrongPasteSelection: _t("This operation is not allowed with multiple selections."),
  willRemoveExistingMerge: _t(
    "This operation is not possible due to a merge. Please remove the merges first than try again."
  ),
  wrongFigurePasteOption: _t("Cannot do a special paste of a figure."),
  frozenPaneOverlap: _t("This operation is not allowed due to an overlapping frozen pane."),
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
  clipboardContent: ParsedOSClipboardContent,
  pasteOption?: ClipboardPasteOptions
) {
  if (clipboardContent.data && clipboardContent.data.version !== CURRENT_VERSION) {
    env.notifyUser({
      type: "warning",
      text: _t(
        "You copied content from a different version of the application. Only text content will be pasted."
      ),
      sticky: false,
    });
  }
  const result = env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
    target,
    clipboardContent,
    pasteOption,
  });
  handlePasteResult(env, result);
}
