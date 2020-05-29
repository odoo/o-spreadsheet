import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";
import { _lt } from "../../translation";

export const colMenuRegistry = new MenuItemRegistry();

colMenuRegistry
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
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 50,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  })
  .add("delete_column", {
    name: ACTIONS.REMOVE_COLUMNS_NAME,
    sequence: 60,
    action: ACTIONS.REMOVE_COLUMNS_ACTION,
  })
  .add("clear_column", {
    name: ACTIONS.DELETE_CONTENT_COLUMNS_NAME,
    sequence: 70,
    action: ACTIONS.DELETE_CONTENT_COLUMNS_ACTION,
  })
  .add("add_column_before", {
    name: ACTIONS.MENU_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 80,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
  })
  .add("add_column_after", {
    name: ACTIONS.MENU_INSERT_COLUMNS_AFTER_NAME,
    sequence: 90,
    action: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
  });
