import { _lt } from "../../translation";
import { SpreadsheetChildEnv } from "../../types";
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
  .add("sort_columns", {
    name: (env) =>
      env.model.getters.getActiveCols().size > 1 ? _lt("Sort columns") : _lt("Sort column"),
    sequence: 50,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
    separator: true,
  })
  .addChild("sort_ascending", ["sort_columns"], {
    name: _lt("Ascending (A ⟶ Z)"),
    sequence: 10,
    action: ACTIONS.SORT_CELLS_ASCENDING,
  })
  .addChild("sort_descending", ["sort_columns"], {
    name: _lt("Descending (Z ⟶ A)"),
    sequence: 20,
    action: ACTIONS.SORT_CELLS_DESCENDING,
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
    name: ACTIONS.REMOVE_COLUMNS_NAME,
    sequence: 90,
    action: ACTIONS.REMOVE_COLUMNS_ACTION,
  })
  .add("clear_column", {
    name: ACTIONS.DELETE_CONTENT_COLUMNS_NAME,
    sequence: 100,
    action: ACTIONS.DELETE_CONTENT_COLUMNS_ACTION,
  })
  .add("hide_columns", {
    name: ACTIONS.HIDE_COLUMNS_NAME,
    sequence: 85,
    action: ACTIONS.HIDE_COLUMNS_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => {
      const sheet = env.model.getters.getActiveSheet();
      const hiddenCols = env.model.getters.getHiddenColsGroups(sheet.id).flat();
      return (
        sheet.cols.length >
        hiddenCols.length + env.model.getters.getElementsFromSelection("COL").length
      );
    },
    separator: true,
  })
  .add("unhide_columns", {
    name: "Unhide columns",
    sequence: 86,
    action: ACTIONS.UNHIDE_COLUMNS_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => {
      const hiddenCols = env.model.getters
        .getHiddenColsGroups(env.model.getters.getActiveSheetId())
        .flat();
      const currentCols = env.model.getters.getElementsFromSelection("COL");
      return currentCols.some((col) => hiddenCols.includes(col));
    },
    separator: true,
  })
  .add("conditional_formatting", {
    name: _lt("Conditional formatting"),
    sequence: 110,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  });
