import { Action, createActions } from "../../actions/action";
import { Model } from "../../model";
import { _t } from "../../translation";

export function createTableStyleContextMenuActions(model: Model, styleId: string): Action[] {
  if (!model.getters.isTableStyleEditable(styleId)) {
    return [];
  }
  return createActions([
    {
      id: "editTableStyle",
      name: _t("Edit table style"),
      execute: (model, env) => env.openSidePanel("TableStyleEditorPanel", { styleId }),
      isEnabled: (model, env) => !env.isSmall,
      icon: "o-spreadsheet-Icon.EDIT",
    },
    {
      id: "deleteTableStyle",
      name: _t("Delete table style"),
      execute: (model) => model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: styleId }),
      icon: "o-spreadsheet-Icon.TRASH",
    },
  ]);
}
