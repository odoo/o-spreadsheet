import { FORBIDDEN_SHEET_CHARS } from "../../constants";
import { _lt } from "../../translation";
import { CommandResult, SpreadsheetChildEnv, UID } from "../../types";

export function interactiveRenameSheet(env: SpreadsheetChildEnv, sheetId: UID, errorText?: string) {
  const placeholder = env.model.getters.getSheetName(sheetId);
  const title = _lt("Rename Sheet");
  const callback = (name: string | null) => {
    if (name === null || name === placeholder) {
      return;
    }
    if (name.trim() === "") {
      interactiveRenameSheet(env, sheetId, _lt("The sheet name cannot be empty."));
    }
    const result = env.model.dispatch("RENAME_SHEET", { sheetId, name });
    if (!result.isSuccessful) {
      if (result.reasons.includes(CommandResult.DuplicatedSheetName)) {
        interactiveRenameSheet(
          env,
          sheetId,
          _lt("A sheet with the name %s already exists. Please select another name.", name)
        );
      }
      if (result.reasons.includes(CommandResult.ForbiddenCharactersInSheetName)) {
        interactiveRenameSheet(
          env,
          sheetId,
          _lt(
            "Some used characters are not allowed in a sheet name (Forbidden characters are %s).",
            FORBIDDEN_SHEET_CHARS.join(" ")
          )
        );
      }
    }
  };
  env.editText(title, callback, {
    placeholder: placeholder,
    error: errorText,
  });
}
