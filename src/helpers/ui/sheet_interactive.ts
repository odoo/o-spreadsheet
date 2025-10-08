import { FORBIDDEN_SHEETNAME_CHARS } from "@odoo/o-spreadsheet-engine/constants";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";
import { CommandResult, UID } from "../../types";

export function interactiveRenameSheet(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  name: string,
  errorCallback: () => void
) {
  const result = env.model.dispatch("RENAME_SHEET", {
    sheetId,
    newName: name,
    oldName: env.model.getters.getSheetName(sheetId),
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
