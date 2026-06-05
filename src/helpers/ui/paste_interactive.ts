import { MergeErrorMessage, RemoveDuplicateTerms } from "../../components/translations_terms";
import { getCurrentVersion } from "../../migrations/data";
import { Model } from "../../model";
import { _t } from "../../translation";
import {
  ClipboardPasteOptions,
  ParsedOSClipboardContent,
  ParsedOsClipboardContentWithImageData,
} from "../../types/clipboard";
import {
  CommandResult,
  CopyPasteCellsAboveCommand,
  CopyPasteCellsOnLeftCommand,
  CopyPasteCellsOnZoneCommand,
  DispatchResult,
} from "../../types/commands";
import { Zone } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export const handleCopyPasteResult = (
  model: Model,
  env: SpreadsheetChildEnv,
  command: CopyPasteCellsAboveCommand | CopyPasteCellsOnLeftCommand | CopyPasteCellsOnZoneCommand
) => {
  const result = model.dispatch(command.type);
  if (result.isCancelledBecause(CommandResult.WillRemoveExistingMerge)) {
    env.raiseError(MergeErrorMessage);
  }
};

export const PasteInteractiveContent = {
  wrongPasteSelection: _t("This operation is not allowed with multiple selections."),
  willRemoveExistingMerge: RemoveDuplicateTerms.Errors.WillRemoveExistingMerge,
  wrongFigurePasteOption: _t("Cannot do a special paste of a figure."),
  frozenPaneOverlap: _t("This operation is not allowed due to an overlapping frozen pane."),
};

export function handlePasteResult(model: Model, env: SpreadsheetChildEnv, result: DispatchResult) {
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
  model: Model,
  env: SpreadsheetChildEnv,
  target: Zone[],
  pasteOption?: ClipboardPasteOptions
) {
  const result = model.dispatch("PASTE", { target, pasteOption });
  handlePasteResult(model, env, result);
}

export async function interactivePasteFromOS(
  model: Model,
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

  const result = model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
    target,
    clipboardContent: parsedClipboardContent,
    pasteOption,
  });

  handlePasteResult(model, env, result);
}
