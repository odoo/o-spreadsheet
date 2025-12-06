import {
  MergeErrorMessage,
  RemoveDuplicateTerms,
} from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { getCurrentVersion } from "@odoo/o-spreadsheet-engine/migrations/data";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import {
  ClipboardPasteOptions,
  CommandResult,
  CopyPasteCellsAboveCommand,
  CopyPasteCellsOnLeftCommand,
  CopyPasteCellsOnZoneCommand,
  DispatchResult,
  ParsedOSClipboardContent,
  ParsedOsClipboardContentWithImageData,
  Zone,
} from "../../types";

export const handleCopyPasteResult = (
  env: SpreadsheetChildEnv,
  command: CopyPasteCellsAboveCommand | CopyPasteCellsOnLeftCommand | CopyPasteCellsOnZoneCommand
) => {
  const result = env.model.dispatch(command.type);
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

    if (parsedSpreadsheetContent?.version !== getCurrentVersion()) {
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
