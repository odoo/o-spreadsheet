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
  })
  .add("paste_special", {
    name: _lt("Paste special"),
    sequence: 40,
    separator: true,
  })
  .addChild("paste_value_only", ["paste_special"], {
    name: _lt("Paste values only"),
    sequence: 10,
    action: ACTIONS.PASTE_VALUE_ACTION,
  })
  .addChild("paste_format_only", ["paste_special"], {
    name: _lt("Paste format only"),
    sequence: 20,
    action: ACTIONS.PASTE_FORMAT_ACTION,
  })
  .add("add_row_before", {
    name: ACTIONS.CELL_INSERT_ROWS_BEFORE_NAME,
    sequence: 50,
    action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
  })
  .add("add_column_before", {
    name: ACTIONS.CELL_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 70,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
    separator: true,
  })
  .add("delete_row", {
    name: ACTIONS.REMOVE_ROWS_NAME,
    sequence: 90,
    action: ACTIONS.REMOVE_ROWS_ACTION,
  })
  .add("delete_column", {
    name: ACTIONS.REMOVE_COLUMNS_NAME,
    sequence: 100,
    action: ACTIONS.REMOVE_COLUMNS_ACTION,
    separator: true,
  })
  .add("clear_cell", {
    name: _lt("Clear cell"),
    sequence: 110,
    action: ACTIONS.DELETE_CONTENT_ACTION,
    isEnabled: (env: SpreadsheetEnv) => {
      const cell = env.getters.getActiveCell();
      return Boolean(cell);
    },
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 120,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
    separator: true,
  });
