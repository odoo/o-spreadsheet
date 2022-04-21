import { buildSheetLink } from "../../helpers";
import { _lt } from "../../translation";
import { createFullMenuItem, MenuItemRegistry } from "../menu_items_registry";

//------------------------------------------------------------------------------
// Link Menu Registry
//------------------------------------------------------------------------------

export const linkMenuRegistry = new MenuItemRegistry();

linkMenuRegistry.add("sheet", {
  name: _lt("Link sheet"),
  sequence: 10,
  children: (env) => {
    const sheets = env.model.getters
      .getSheetIds()
      .map((sheetId) => env.model.getters.getSheet(sheetId));
    return sheets.map((sheet, i) =>
      createFullMenuItem(sheet.id, {
        name: sheet.name,
        sequence: i,
        action: () => ({
          link: { label: sheet.name, url: buildSheetLink(sheet.id) },
          urlRepresentation: sheet.name,
          isUrlEditable: false,
        }),
      })
    );
  },
});
