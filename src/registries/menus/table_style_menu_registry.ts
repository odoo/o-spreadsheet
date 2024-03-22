import { Action, createActions } from "../../actions/action";
import { _t } from "../../translation";
import { SpreadsheetChildEnv } from "./../../types/env";

export function createTableStyleContextMenuActions(
  env: SpreadsheetChildEnv,
  styleId: string
): Action[] {
  if (!env.model.getters.isTableStyleEditable(styleId)) {
    return [];
  }
  return createActions([
    {
      id: "editTableStyle",
      name: _t("Edit table style"),
      execute: (env) => env.openSidePanel("TableStyleEditorPanel", { styleId }),
      icon: "o-spreadsheet-Icon.EDIT_TABLE",
    },
    {
      id: "deleteTableStyle",
      name: _t("Delete table style"),
      execute: (env) => env.model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: styleId }),
      icon: "o-spreadsheet-Icon.DELETE_TABLE",
    },
  ]);
}
