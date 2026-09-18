import { MergeErrorMessage, RemoveDuplicateTerms } from "../../components/translations_terms";
import { getCurrentVersion } from "../../migrations/data";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { ClipboardStore } from "../../stores/clipboard_store";
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
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export const handleCopyPasteResult = (
  env: SpreadsheetActionEnv,
  command: CopyPasteCellsAboveCommand | CopyPasteCellsOnLeftCommand | CopyPasteCellsOnZoneCommand
) => {
  const clipboardStore = env.getStore(ClipboardStore);
  const result = clipboardStore.isCommandValid(command);
  if (result.isCancelledBecause(CommandResult.WillRemoveExistingMerge)) {
    env.getPlugin(NotificationPlugin).raiseError(MergeErrorMessage);
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

export function handlePasteResult(env: SpreadsheetActionEnv, result: DispatchResult) {
  const notificationPlugin = env.getPlugin(NotificationPlugin);
  if (!result.isSuccessful) {
    if (result.reasons.includes(CommandResult.WrongPasteSelection)) {
      notificationPlugin.raiseError(PasteInteractiveContent.wrongPasteSelection);
    } else if (result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
      notificationPlugin.raiseError(PasteInteractiveContent.willRemoveExistingMerge);
    } else if (result.reasons.includes(CommandResult.WrongFigurePasteOption)) {
      notificationPlugin.raiseError(PasteInteractiveContent.wrongFigurePasteOption);
    } else if (result.reasons.includes(CommandResult.FrozenPaneOverlap)) {
      notificationPlugin.raiseError(PasteInteractiveContent.frozenPaneOverlap);
    }
  }
}

export function interactivePaste(
  env: SpreadsheetActionEnv,
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
  env: SpreadsheetActionEnv,
  target: Zone[],
  parsedClipboardContent: ParsedOSClipboardContent,
  pasteOption?: ClipboardPasteOptions
) {
  const notificationPlugin = env.getPlugin(NotificationPlugin);
  if (parsedClipboardContent.data && parsedClipboardContent.data.version !== getCurrentVersion()) {
    notificationPlugin.notifyUser({
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
      notificationPlugin.raiseError(msg);
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
