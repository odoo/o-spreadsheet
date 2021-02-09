import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";

export const colMenuRegistry = new MenuItemRegistry();

colMenuRegistry
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
    name: _lt("Paste value only"),
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
    isVisible: ACTIONS.SORT_CELLS_VISIBILITY,
    separator: true,
  })
  .add("add_column_before", {
    name: ACTIONS.COLUMN_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 70,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
  })
  .add("add_column_after", {
    name: ACTIONS.COLUMN_INSERT_COLUMNS_AFTER_NAME,
    sequence: 80,
    action: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
  })
  .add("delete_column", {
    name: ACTIONS.DELETE_COLUMNS_NAME,
    sequence: 90,
    action: ACTIONS.DELETE_COLUMNS_ACTION,
  })
  .add("clear_column", {
    name: ACTIONS.DELETE_CONTENT_COLUMNS_NAME,
    sequence: 100,
    action: ACTIONS.DELETE_CONTENT_COLUMNS_ACTION,
    separator: true,
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 110,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  });
