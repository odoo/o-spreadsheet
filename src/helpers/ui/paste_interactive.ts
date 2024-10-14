import { CURRENT_VERSION } from "../../migrations/data";
import { _t } from "../../translation";
import {
  ClipboardPasteOptions,
  CommandResult,
  DispatchResult,
  ParsedOSClipboardContent,
  ParsedOsClipboardContentWithImageData,
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

export async function interactivePasteFromOS(
  env: SpreadsheetChildEnv,
  target: Zone[],
  parsedClipboardContent: ParsedOSClipboardContent,
  pasteOption?: ClipboardPasteOptions
) {
  let result: DispatchResult;
  // We do not trust the clipboard content to be accurate and comprehensive.
  // Therefore, to ensure reliability, we handle unexpected errors that may
  // arise from content that would not be suitable for the current version.
  try {
    const clipboarContent: ParsedOsClipboardContentWithImageData = parsedClipboardContent;

    if (parsedClipboardContent.imageBlob) {
      try {
        const imageData = await env.imageProvider?.uploadFile(parsedClipboardContent.imageBlob);
        clipboarContent.imageData = imageData;
      } catch (e) {
        const msg = _t("An error occurred while uploading the image. %s", e.message);
        console.error(e);
        env.raiseError(msg);
      }
      delete parsedClipboardContent.imageBlob;
    }

    result = env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      target,
      clipboardContent: parsedClipboardContent,
      pasteOption,
    });
  } catch (error) {
    const parsedSpreadsheetContent = parsedClipboardContent.data;

    if (parsedSpreadsheetContent?.version !== CURRENT_VERSION) {
      env.raiseError(
        _t(
          "An unexpected error occurred while pasting content.\
          This is probably due to a spreadsheet version mismatch."
        )
      );
    } else {
      env.raiseError(
        _t(
          "An unexpected error occurred while pasting content.\
          Additional information can be found in the browser console."
        )
      );
      console.error(error);
    }
    result = env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      target,
      clipboardContent: {
        text: parsedClipboardContent.text,
      },
      pasteOption,
    });
  }
  handlePasteResult(env, result);
}
