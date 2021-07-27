import { buildSheetLink } from "../../helpers";
import { _lt } from "../../translation";
import { createFullMenuItem, MenuItemRegistry } from "../menu_items_registry";

//------------------------------------------------------------------------------
// Link Menu Registry
//------------------------------------------------------------------------------

export const linkMenuRegistry = new MenuItemRegistry();

linkMenuRegistry
  .add("sheet", {
    name: _lt("Link another sheet"),
    sequence: 10,
    children: (env) => {
      const sheets = env.getters.getSheets();
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
  })
  .add("dummy1", {
    //TO remove and add via odoo
    name: _lt("Add Odoo menu"),
    sequence: 50,
    action: () => console.log("kikou"),
  });
