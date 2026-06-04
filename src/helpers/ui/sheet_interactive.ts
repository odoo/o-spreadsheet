import { FORBIDDEN_SHEETNAME_CHARS } from "../../constants";
import { Model } from "../../model";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { UID } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function interactiveRenameSheet(
  model: Model,
  env: SpreadsheetChildEnv,
  sheetId: UID,
  name: string,
  errorCallback: () => void
) {
  const result = model.dispatch("RENAME_SHEET", {
    sheetId,
    newName: name,
    oldName: model.getters.getSheetName(sheetId),
  });
  if (result.reasons.includes(CommandResult.MissingSheetName)) {
    env.raiseError(_t("The sheet name cannot be empty."), errorCallback);
  } else if (result.reasons.includes(CommandResult.DuplicatedSheetName)) {
    env.raiseError(
      _t("A sheet with the name %s already exists. Please select another name.", name),
      errorCallback
    );
  } else if (result.reasons.includes(CommandResult.ForbiddenCharactersInSheetName)) {
    env.raiseError(
      _t(
        "Some used characters are not allowed in a sheet name (Forbidden characters are %s).",
        FORBIDDEN_SHEETNAME_CHARS.join(" ")
      ),
      errorCallback
    );
  }
}
