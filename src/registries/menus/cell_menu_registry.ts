import { _lt } from "../../translation";
import { SpreadsheetEnv } from "../../types";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export const cellMenuRegistry = new MenuItemRegistry();

cellMenuRegistry
  .add("cut", {
    name: _lt("Cut"),
    shortCut: "Ctrl+X",
    sequence: 10,
    action: ACTIONS.CUT_ACTION,
  })
  .add("copy", {
    name: _lt("Copy"),
    shortCut: "Ctrl+C",
    sequence: 20,
    action: ACTIONS.COPY_ACTION,
  })
  .add("paste", {
    name: _lt("Paste"),
    shortCut: "Ctrl+V",
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
  .add("sort_ascending", {
    name: _lt("Ascending Sort"),
    sequence: 50,
    action: ACTIONS.SORT_CELLS_ASCENDING,
    isVisible: ACTIONS.SORT_CELLS_VISIBILITY,
  })
  .add("sort_descending", {
    name: _lt("Descending Sort"),
    sequence: 60,
    action: ACTIONS.SORT_CELLS_DESCENDING,
    separator: true,
    isVisible: ACTIONS.SORT_CELLS_VISIBILITY,
  })
  .add("add_row_before", {
    name: ACTIONS.CELL_INSERT_ROWS_BEFORE_NAME,
    sequence: 70,
    action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
  })
  .add("add_column_before", {
    name: ACTIONS.CELL_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 90,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
    separator: true,
  })
  .add("delete_row", {
    name: ACTIONS.DELETE_ROWS_NAME,
    sequence: 110,
    action: ACTIONS.DELETE_ROWS_ACTION,
  })
  .add("delete_column", {
    name: ACTIONS.DELETE_COLUMNS_NAME,
    sequence: 120,
    action: ACTIONS.DELETE_COLUMNS_ACTION,
    separator: true,
  })
  .add("clear_cell", {
    name: _lt("Clear cell"),
    sequence: 130,
    action: ACTIONS.DELETE_CONTENT_ACTION,
    isEnabled: (env: SpreadsheetEnv) => {
      const cell = env.getters.getActiveCell();
      return Boolean(cell);
    },
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 140,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
    separator: true,
  });
