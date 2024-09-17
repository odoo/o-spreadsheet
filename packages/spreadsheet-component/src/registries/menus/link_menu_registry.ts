import * as ACTION_SHEET from "../../actions/sheet_actions";
import { MenuItemRegistry } from "../menu_items_registry";

//------------------------------------------------------------------------------
// Link Menu Registry
//------------------------------------------------------------------------------

export const linkMenuRegistry = new MenuItemRegistry();

linkMenuRegistry.add("sheet", {
  ...ACTION_SHEET.linkSheet,
  sequence: 10,
});
