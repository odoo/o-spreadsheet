import { buildSheetLink, markdownLink } from "../../helpers";
import { _lt } from "../../translation";
import { createFullMenuItem, MenuItemRegistry } from "../menu_items_registry";

//------------------------------------------------------------------------------
// Link Menu Registry
//------------------------------------------------------------------------------

export const linkMenuRegistry = new MenuItemRegistry();

linkMenuRegistry
  .add("sheet", {
    name: _lt("Link sheet"),
    sequence: 10,
  })
  .addChild("sheet_list", ["sheet"], (env) => {
    const sheets = env.model.getters
      .getSheetIds()
      .map((sheetId) => env.model.getters.getSheet(sheetId));
    return sheets.map((sheet, i) =>
      createFullMenuItem(sheet.id, {
        name: sheet.name,
        sequence: i,
        action: () => markdownLink(sheet.name, buildSheetLink(sheet.id)),
      })
    );
  });
