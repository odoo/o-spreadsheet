import { _lt } from "../../translation";
import { SpreadsheetChildEnv } from "../../types";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";

export const rowMenuRegistry = new MenuItemRegistry();

rowMenuRegistry
  .add("cut", {
    name: _lt("Cut"),
    sequence: 10,
    shortCut: "Ctrl+X",
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
  })
  .add("paste_special", {
    name: _lt("Paste special"),
    sequence: 40,
    separator: true,
    isVisible: ACTIONS.IS_NOT_CUT_OPERATION,
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
  .add("add_row_before", {
    name: ACTIONS.ROW_INSERT_ROWS_BEFORE_NAME,
    sequence: 50,
    action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
  })
  .add("add_row_after", {
    name: ACTIONS.ROW_INSERT_ROWS_AFTER_NAME,
    sequence: 60,
    action: ACTIONS.INSERT_ROWS_AFTER_ACTION,
  })
  .add("delete_row", {
    name: ACTIONS.REMOVE_ROWS_NAME,
    sequence: 70,
    action: ACTIONS.REMOVE_ROWS_ACTION,
  })
  .add("clear_row", {
    name: ACTIONS.DELETE_CONTENT_ROWS_NAME,
    sequence: 80,
    action: ACTIONS.DELETE_CONTENT_ROWS_ACTION,
  })
  .add("hide_rows", {
    name: ACTIONS.HIDE_ROWS_NAME,
    sequence: 85,
    action: ACTIONS.HIDE_ROWS_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => {
      const sheet = env.model.getters.getActiveSheet();
      const hiddenRows = env.model.getters.getHiddenRowsGroups(sheet.id).flat();
      return (
        sheet.rows.length >
        hiddenRows.length + env.model.getters.getElementsFromSelection("ROW").length
      );
    },
    separator: true,
  })
  .add("unhide_rows", {
    name: "Unhide rows",
    sequence: 86,
    action: ACTIONS.UNHIDE_ROWS_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => {
      const hiddenRows = env.model.getters
        .getHiddenRowsGroups(env.model.getters.getActiveSheetId())
        .flat();
      const currentRows = env.model.getters.getElementsFromSelection("ROW");
      return currentRows.some((col) => hiddenRows.includes(col));
    },
    separator: true,
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 90,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  });
