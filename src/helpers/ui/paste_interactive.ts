import { MergeErrorMessage, RemoveDuplicateTerms } from "../../components/translations_terms";
import { getCurrentVersion } from "../../migrations/data";
import { ClipboardStore } from "../../plugins/ui_stateful/clipboard";
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
  env: SpreadsheetChildEnv,
  command: CopyPasteCellsAboveCommand | CopyPasteCellsOnLeftCommand | CopyPasteCellsOnZoneCommand
) => {
  const clipboardStore = env.getStore(ClipboardStore);
  const result = clipboardStore.isCommandValid(command);
  if (result.isCancelledBecause(CommandResult.WillRemoveExistingMerge)) {
    env.raiseError(MergeErrorMessage);
  } else {
    env.model.dispatch(command.type, command);
  }
};

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
  const clipboardStore = env.getStore(ClipboardStore);
  const result = clipboardStore.isCommandValid({ type: "PASTE", target, pasteOption });
  if (!result.isSuccessful) {
    handlePasteResult(env, result);
  } else {
    env.model.dispatch("PASTE", { target, pasteOption });
  }
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

  const payload = {
    target,
    clipboardContent: parsedClipboardContent,
    pasteOption,
  };

  const clipboardStore = env.getStore(ClipboardStore);
  const result = clipboardStore.isCommandValid({ type: "PASTE_FROM_OS_CLIPBOARD", ...payload });

  if (!result.isSuccessful) {
    handlePasteResult(env, result);
  } else {
    env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", payload);
  }
}
