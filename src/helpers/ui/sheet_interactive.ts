import { FORBIDDEN_SHEET_CHARS } from "../../constants";
import { _lt } from "../../translation";
import { CommandResult, SpreadsheetChildEnv, UID } from "../../types";

export function interactiveRenameSheet(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  name: string,
  errorCallback: () => void
) {
  const result = env.model.dispatch("RENAME_SHEET", { sheetId, name });
  if (result.reasons.includes(CommandResult.MissingSheetName)) {
    env.raiseError(_lt("The sheet name cannot be empty."), errorCallback);
  } else if (result.reasons.includes(CommandResult.DuplicatedSheetName)) {
    env.raiseError(
      _lt("A sheet with the name %s already exists. Please select another name.", name),
      errorCallback
    );
  } else if (result.reasons.includes(CommandResult.ForbiddenCharactersInSheetName)) {
    env.raiseError(
      _lt(
        "Some used characters are not allowed in a sheet name (Forbidden characters are %s).",
        FORBIDDEN_SHEET_CHARS.join(" ")
      ),
      errorCallback
    );
  }
}
