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
      name: _t("Edit table style"),
      execute: (env) => {},
      icon: "o-spreadsheet-Icon.EDIT_TABLE",
    },
    {
      name: _t("Delete table style"),
      execute: (env) => {},
      icon: "o-spreadsheet-Icon.DELETE_TABLE",
    },
  ]);
}
