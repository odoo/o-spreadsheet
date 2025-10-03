import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/env";
import { Action, createActions } from "../../actions/action";

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
      isEnabled: (env) => !env.isSmall,
      icon: "o-spreadsheet-Icon.EDIT",
    },
    {
      id: "deleteTableStyle",
      name: _t("Delete table style"),
      execute: (env) => env.model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: styleId }),
      icon: "o-spreadsheet-Icon.TRASH",
    },
  ]);
}
