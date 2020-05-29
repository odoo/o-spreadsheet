import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";
import { SpreadsheetEnv } from "../../types";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export const cellMenuRegistry = new MenuItemRegistry();

cellMenuRegistry
  .add("cut", {
    name: _lt("Cut"),
    sequence: 10,
    action: ACTIONS.CUT_ACTION,
  })
  .add("copy", {
    name: _lt("Copy"),
    sequence: 20,
    action: ACTIONS.COPY_ACTION,
  })
  .add("paste", {
    name: _lt("Paste"),
    sequence: 30,
    action: ACTIONS.PASTE_ACTION,
    separator: true,
  })
  .add("paste_special", {
    name: _lt("Paste special"),
    sequence: 40,
    separator: true,
  })
  .addChild("paste_format_only", ["paste_special"], {
    name: _lt("Paste format only"),
    sequence: 10,
    action: ACTIONS.PASTE_FORMAT_ACTION,
  })
  .add("clear_cell", {
    name: _lt("Clear cell"),
    sequence: 50,
    action: ACTIONS.DELETE_CONTENT_ACTION,
    isEnabled: (env: SpreadsheetEnv) => {
      const cell = env.getters.getActiveCell();
      return Boolean(cell && cell.content);
    },
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 60,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  });
