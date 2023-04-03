import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTION_SHEET from "./items/sheet_menu_items";

//------------------------------------------------------------------------------
// Link Menu Registry
//------------------------------------------------------------------------------

export const linkMenuRegistry = new MenuItemRegistry();

linkMenuRegistry.add("sheet", {
  ...ACTION_SHEET.linkSheet,
  sequence: 10,
});
