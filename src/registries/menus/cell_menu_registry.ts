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
    isReadonlyAllowed: true,
    action: ACTIONS.COPY_ACTION,
  })
  .add("paste", {
    name: _lt("Paste"),
    shortCut: "Ctrl+V",
    sequence: 30,
    action: ACTIONS.PASTE_ACTION,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  })
  .add("paste_special", {
    name: _lt("Paste special"),
    sequence: 40,
    separator: true,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
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
  .add("sort_range", {
    name: _lt("Sort range"),
    sequence: 50,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
    separator: true,
  })
  .addChild("sort_ascending", ["sort_range"], {
    name: _lt("Ascending (A ⟶ Z)"),
    sequence: 10,
    action: ACTIONS.SORT_CELLS_ASCENDING,
  })
  .addChild("sort_descending", ["sort_range"], {
    name: _lt("Descending (Z ⟶ A)"),
    sequence: 20,
    action: ACTIONS.SORT_CELLS_DESCENDING,
  })
  .add("add_row_before", {
    name: ACTIONS.CELL_INSERT_ROWS_BEFORE_NAME,
    sequence: 70,
    action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  })
  .add("add_column_before", {
    name: ACTIONS.CELL_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 90,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  })
  .add("insert_cell", {
    name: _lt("Insert cells"),
    sequence: 100,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
    separator: true,
  })
  .addChild("insert_cell_down", ["insert_cell"], {
    name: _lt("Shift down"),
    sequence: 10,
    action: ACTIONS.INSERT_CELL_SHIFT_DOWN,
  })
  .addChild("insert_cell_right", ["insert_cell"], {
    name: _lt("Shift right"),
    sequence: 20,
    action: ACTIONS.INSERT_CELL_SHIFT_RIGHT,
  })
  .add("delete_row", {
    name: ACTIONS.REMOVE_ROWS_NAME,
    sequence: 110,
    action: ACTIONS.REMOVE_ROWS_ACTION,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  })
  .add("delete_column", {
    name: ACTIONS.REMOVE_COLUMNS_NAME,
    sequence: 120,
    action: ACTIONS.REMOVE_COLUMNS_ACTION,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  })
  .add("delete_cell", {
    name: _lt("Delete cells"),
    sequence: 130,
    separator: true,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  })
  .addChild("delete_cell_up", ["delete_cell"], {
    name: _lt("Shift up"),
    sequence: 10,
    action: ACTIONS.DELETE_CELL_SHIFT_UP,
  })
  .addChild("delete_cell_down", ["delete_cell"], {
    name: _lt("Shift left"),
    sequence: 20,
    action: ACTIONS.DELETE_CELL_SHIFT_LEFT,
  })
  .add("insert_link", {
    name: _lt("Insert Link"),
    separator: true,
    sequence: 135,
    action: ACTIONS.INSERT_LINK,
  })
  .add("clear_cell", {
    name: _lt("Clear cells"),
    sequence: 140,
    action: ACTIONS.DELETE_CONTENT_ACTION,
    isEnabled: (env: SpreadsheetEnv) => {
      const cell = env.getters.getActiveCell();
      return Boolean(cell);
    },
    separator: true,
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 140,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
    separator: true,
  });
