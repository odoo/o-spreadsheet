import { FORBIDDEN_SHEET_CHARS } from "../../constants";
import { _lt } from "../../translation";
import { CommandResult, SpreadsheetEnv, UID } from "../../types";

export function interactiveRenameSheet(env: SpreadsheetEnv, sheetId: UID, message?: string) {
  const placeholder = env.getters.getSheetName(sheetId);
  //TODO We should update editText to take a message in addition to the title
  const t = _lt("Rename Sheet") + (message ? " - " + message : "");
  env.editText(t, placeholder, (name: string | null) => {
    if (name === null || name === placeholder) {
      return;
    }
    if (name === "") {
      interactiveRenameSheet(env, sheetId, _lt("The sheet name cannot be empty."));
    }
    const result = env.dispatch("RENAME_SHEET", { sheetId, name });
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
  });
}
