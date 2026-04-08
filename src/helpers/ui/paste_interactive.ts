import { RemoveDuplicateTerms } from "../../components/translations_terms";
import { getCurrentVersion } from "../../migrations/data";
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
  willRemoveExistingMerge: RemoveDuplicateTerms.Errors.WillRemoveExistingMerge,
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
  if (parsedClipboardContent.data && parsedClipboardContent.data.version !== getCurrentVersion()) {
    env.notifyUser({
      type: "warning",
      text: _t(
        "You copied content from a different version of the application. Only text and image content will be pasted."
      ),
      sticky: false,
    });
  }
  let result: DispatchResult;

  if (parsedClipboardContent.imageBlob) {
    const clipboardContent: ParsedOsClipboardContentWithImageData = parsedClipboardContent;
    try {
      const imageData = await env.imageProvider?.uploadFile(parsedClipboardContent.imageBlob);
      clipboardContent.imageData = imageData;
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

  handlePasteResult(env, result);
}
