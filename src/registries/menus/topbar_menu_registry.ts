import { fontSizes } from "../../fonts";
import { _lt } from "../../translation";
import { SpreadsheetEnv } from "../../types/env";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";

export const topbarMenuRegistry = new MenuItemRegistry();

topbarMenuRegistry
  .add("file", { name: _lt("File"), sequence: 10 })
  .add("edit", { name: _lt("Edit"), sequence: 20 })
  .add("view", { name: _lt("View"), sequence: 30 })
  .add("insert", { name: _lt("Insert"), sequence: 40 })
  .add("format", { name: _lt("Format"), sequence: 50 })
  .add("data", { name: _lt("Data"), sequence: 60 })
  .addChild("save", ["file"], {
    name: _lt("Save"),
    shortCut: "Ctrl+S",
    sequence: 10,
    action: () => console.log("Not implemented"),
  })
  .addChild("undo", ["edit"], {
    name: _lt("Undo"),
    shortCut: "Ctrl+Z",
    sequence: 10,
    action: ACTIONS.UNDO_ACTION,
  })
  .addChild("redo", ["edit"], {
    name: _lt("Redo"),
    shortCut: "Ctrl+Y",
    sequence: 20,
    action: ACTIONS.REDO_ACTION,
    separator: true,
  })
  .addChild("copy", ["edit"], {
    name: _lt("Copy"),
    shortCut: "Ctrl+C",
    sequence: 30,
    isReadonlyAllowed: true,
    action: ACTIONS.COPY_ACTION,
  })
  .addChild("cut", ["edit"], {
    name: _lt("Cut"),
    shortCut: "Ctrl+X",
    sequence: 40,
    action: ACTIONS.CUT_ACTION,
  })
  .addChild("paste", ["edit"], {
    name: _lt("Paste"),
    shortCut: "Ctrl+V",
    sequence: 50,
    action: ACTIONS.PASTE_ACTION,
  })
  .addChild("paste_special", ["edit"], {
    name: _lt("Paste special"),
    sequence: 60,
    separator: true,
  })
  .addChild("paste_special_value", ["edit", "paste_special"], {
    name: _lt("Paste value only"),
    sequence: 10,
    action: ACTIONS.PASTE_VALUE_ACTION,
  })
  .addChild("paste_special_format", ["edit", "paste_special"], {
    name: _lt("Paste format only"),
    sequence: 20,
    action: ACTIONS.PASTE_FORMAT_ACTION,
  })
  .addChild("sort_range", ["edit"], {
    name: _lt("Sort range"),
    sequence: 62,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
    separator: true,
  })
  .addChild("sort_ascending", ["edit", "sort_range"], {
    name: _lt("Ascending (A ⟶ Z)"),
    sequence: 10,
    action: ACTIONS.SORT_CELLS_ASCENDING,
  })
  .addChild("sort_descending", ["edit", "sort_range"], {
    name: _lt("Descending (Z ⟶ A)"),
    sequence: 20,
    action: ACTIONS.SORT_CELLS_DESCENDING,
  })
  .addChild("find_and_replace", ["edit"], {
    name: _lt("Find and replace"),
    shortCut: "Ctrl+H",
    sequence: 65,
    isReadonlyAllowed: true,
    action: ACTIONS.OPEN_FAR_SIDEPANEL_ACTION,
    separator: true,
  })
  .addChild("edit_delete_cell_values", ["edit"], {
    name: _lt("Delete values"),
    sequence: 70,
    action: ACTIONS.DELETE_CONTENT_ACTION,
  })
  .addChild("edit_delete_row", ["edit"], {
    name: ACTIONS.REMOVE_ROWS_NAME,
    sequence: 80,
    action: ACTIONS.REMOVE_ROWS_ACTION,
  })
  .addChild("edit_delete_column", ["edit"], {
    name: ACTIONS.REMOVE_COLUMNS_NAME,
    sequence: 90,
    action: ACTIONS.REMOVE_COLUMNS_ACTION,
  })
  .addChild("edit_delete_cell_shift_up", ["edit"], {
    name: _lt("Delete cell and shift up"),
    sequence: 93,
    action: ACTIONS.DELETE_CELL_SHIFT_UP,
  })
  .addChild("edit_delete_cell_shift_left", ["edit"], {
    name: _lt("Delete cell and shift left"),
    sequence: 97,
    action: ACTIONS.DELETE_CELL_SHIFT_LEFT,
  })
  .addChild("edit_unhide_columns", ["edit"], {
    name: _lt("Unhide all columns"),
    sequence: 100,
    action: ACTIONS.UNHIDE_ALL_COLUMNS_ACTION,
    isVisible: (env: SpreadsheetEnv) =>
      env.getters.getHiddenColsGroups(env.getters.getActiveSheetId()).length > 0,
  })
  .addChild("edit_unhide_rows", ["edit"], {
    name: _lt("Unhide all rows"),
    sequence: 100,
    action: ACTIONS.UNHIDE_ALL_ROWS_ACTION,
    isVisible: (env: SpreadsheetEnv) =>
      env.getters.getHiddenRowsGroups(env.getters.getActiveSheetId()).length > 0,
  })
  .addChild("insert_row_before", ["insert"], {
    name: ACTIONS.MENU_INSERT_ROWS_BEFORE_NAME,
    sequence: 10,
    action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
    isVisible: (env: SpreadsheetEnv) => env.getters.getActiveCols().size === 0,
  })
  .addChild("insert_row_after", ["insert"], {
    name: ACTIONS.MENU_INSERT_ROWS_AFTER_NAME,
    sequence: 20,
    action: ACTIONS.INSERT_ROWS_AFTER_ACTION,
    isVisible: (env: SpreadsheetEnv) => env.getters.getActiveCols().size === 0,
    separator: true,
  })
  .addChild("insert_column_before", ["insert"], {
    name: ACTIONS.MENU_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 30,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
    isVisible: (env: SpreadsheetEnv) => env.getters.getActiveRows().size === 0,
  })
  .addChild("insert_column_after", ["insert"], {
    name: ACTIONS.MENU_INSERT_COLUMNS_AFTER_NAME,
    sequence: 40,
    action: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
    isVisible: (env: SpreadsheetEnv) => env.getters.getActiveRows().size === 0,
    separator: true,
  })
  .addChild("insert_insert_cell_shift_down", ["insert"], {
    name: _lt("Insert cells and shift down"),
    sequence: 43,
    action: ACTIONS.INSERT_CELL_SHIFT_DOWN,
  })
  .addChild("insert_insert_cell_shift_right", ["insert"], {
    name: _lt("Insert cells and shift right"),
    sequence: 47,
    action: ACTIONS.INSERT_CELL_SHIFT_RIGHT,
    separator: true,
  })
  .addChild("insert_chart", ["insert"], {
    name: _lt("Chart"),
    sequence: 50,
    action: ACTIONS.CREATE_CHART,
  })
  .addChild("insert_link", ["insert"], {
    name: _lt("Link"),
    separator: true,
    sequence: 60,
    action: ACTIONS.INSERT_LINK,
  })
  .addChild("insert_sheet", ["insert"], {
    name: _lt("New sheet"),
    sequence: 70,
    action: ACTIONS.CREATE_SHEET_ACTION,
    separator: true,
  })
  .addChild("view_gridlines", ["view"], {
    name: (env: SpreadsheetEnv) =>
      env.getters.getGridLinesVisibility(env.getters.getActiveSheetId())
        ? _lt("Hide gridlines")
        : _lt("Show gridlines"),
    action: ACTIONS.SET_GRID_LINES_VISIBILITY_ACTION,
    sequence: 5,
    separator: true,
  })
  .addChild("view_formulas", ["view"], {
    name: (env: SpreadsheetEnv) =>
      env.getters.shouldShowFormulas() ? _lt("Hide formulas") : _lt("Show formulas"),
    action: ACTIONS.SET_FORMULA_VISIBILITY_ACTION,
    isReadonlyAllowed: true,
    sequence: 10,
  })
  .addChild("format_number", ["format"], {
    name: _lt("Numbers"),
    sequence: 10,
    separator: true,
  })
  .addChild("format_number_general", ["format", "format_number"], {
    name: _lt("General"),
    sequence: 10,
    separator: true,
    action: ACTIONS.FORMAT_GENERAL_ACTION,
  })
  .addChild("format_number_number", ["format", "format_number"], {
    name: _lt("Number (1,000.12)"),
    sequence: 20,
    action: ACTIONS.FORMAT_NUMBER_ACTION,
  })
  .addChild("format_number_percent", ["format", "format_number"], {
    name: _lt("Percent (10.12%)"),
    sequence: 30,
    separator: true,
    action: ACTIONS.FORMAT_PERCENT_ACTION,
  })
  .addChild("format_number_date", ["format", "format_number"], {
    name: _lt("Date (9/26/2008)"),
    sequence: 40,
    action: ACTIONS.FORMAT_DATE_ACTION,
  })
  .addChild("format_number_time", ["format", "format_number"], {
    name: _lt("Time (10:43:00 PM)"),
    sequence: 50,
    action: ACTIONS.FORMAT_TIME_ACTION,
  })
  .addChild("format_number_date_time", ["format", "format_number"], {
    name: _lt("Date time (9/26/2008 22:43:00)"),
    sequence: 60,
    action: ACTIONS.FORMAT_DATE_TIME_ACTION,
  })
  .addChild("format_number_duration", ["format", "format_number"], {
    name: _lt("Duration (27:51:38)"),
    sequence: 70,
    separator: true,
    action: ACTIONS.FORMAT_DURATION_ACTION,
  })
  .addChild("format_bold", ["format"], {
    name: _lt("Bold"),
    sequence: 20,
    shortCut: "Ctrl+B",
    action: ACTIONS.FORMAT_BOLD_ACTION,
  })
  .addChild("format_italic", ["format"], {
    name: _lt("Italic"),
    sequence: 30,
    shortCut: "Ctrl+I",
    action: ACTIONS.FORMAT_ITALIC_ACTION,
  })
  .addChild("format_underline", ["format"], {
    name: _lt("Underline"),
    shortCut: "Ctrl+U",
    sequence: 40,
    action: ACTIONS.FORMAT_UNDERLINE_ACTION,
  })
  .addChild("format_strikethrough", ["format"], {
    name: _lt("Strikethrough"),
    sequence: 50,
    action: ACTIONS.FORMAT_STRIKETHROUGH_ACTION,
    separator: true,
  })
  .addChild("format_font_size", ["format"], {
    name: _lt("Font size"),
    sequence: 60,
    separator: true,
  })
  .addChild("format_cf", ["format"], {
    name: _lt("Conditional formatting"),
    sequence: 70,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
    separator: true,
  });

// Font-sizes
for (let fs of fontSizes) {
  topbarMenuRegistry.addChild(`format_font_size_${fs.pt}`, ["format", "format_font_size"], {
    name: fs.pt.toString(),
    sequence: fs.pt,
    action: (env: SpreadsheetEnv) => ACTIONS.setStyle(env, { fontSize: fs.pt }),
  });
}
