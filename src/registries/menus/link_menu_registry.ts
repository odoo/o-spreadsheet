import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

//------------------------------------------------------------------------------
// Link Menu Registry
//------------------------------------------------------------------------------

export const linkMenuRegistry = new MenuItemRegistry();

linkMenuRegistry
  .add("sheet", {
    name: _lt("Link another sheet"),
    sequence: 10,
  })
  .add("dummy1", {
    //TO remove and add via odoo
    name: _lt("Add Odoo menu"),
    sequence: 50,
    action: () => console.log("kikou"),
  });
