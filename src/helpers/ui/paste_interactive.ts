import { ClipboardContent, CommandResult, DispatchResult } from "../..";
import { CURRENT_VERSION } from "../../migrations/data";
import { _t } from "../../translation";
import { ClipboardMIMEType, ClipboardPasteOptions, SpreadsheetChildEnv, Zone } from "../../types";

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
  clipboardContent: ClipboardContent,
  pasteOption?: ClipboardPasteOptions
) {
  let result: DispatchResult;
  try {
    result = env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      target,
      clipboardContent,
      pasteOption,
    });
  } catch (error) {
    const parsedSpreadsheetContent = clipboardContent[ClipboardMIMEType.OSpreadsheet]
      ? JSON.parse(clipboardContent[ClipboardMIMEType.OSpreadsheet])
      : {};
    if (parsedSpreadsheetContent.version !== CURRENT_VERSION) {
      env.raiseError(
        _t(
          "An unexpected error occurred while pasting content. This is probably due to a version mismatch."
        )
      );
    }
    result = env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      target,
      clipboardContent: {
        [ClipboardMIMEType.PlainText]: clipboardContent[ClipboardMIMEType.PlainText],
      },
      pasteOption,
    });
  }
  handlePasteResult(env, result);
}
