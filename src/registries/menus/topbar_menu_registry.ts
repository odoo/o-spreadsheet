import { NumberFormatTerms } from "../../components/translations_terms";
import { fontSizes } from "../../fonts";
import { interactiveFreezeColumnsRows } from "../../helpers/ui/freeze_interactive";
import { _lt } from "../../translation";
import { SpreadsheetChildEnv } from "../../types/env";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTIONS from "./menu_items_actions";
import { setStyle } from "./menu_items_actions";

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
    description: "Ctrl+S",
    sequence: 10,
    action: () => console.log("Not implemented"),
  })
  .addChild("undo", ["edit"], {
    name: _lt("Undo"),
    description: "Ctrl+Z",
    sequence: 10,
    action: ACTIONS.UNDO_ACTION,
  })
  .addChild("redo", ["edit"], {
    name: _lt("Redo"),
    description: "Ctrl+Y",
    sequence: 20,
    action: ACTIONS.REDO_ACTION,
    separator: true,
  })
  .addChild("copy", ["edit"], {
    name: _lt("Copy"),
    description: "Ctrl+C",
    sequence: 30,
    isReadonlyAllowed: true,
    action: ACTIONS.COPY_ACTION,
  })
  .addChild("cut", ["edit"], {
    name: _lt("Cut"),
    description: "Ctrl+X",
    sequence: 40,
    action: ACTIONS.CUT_ACTION,
  })
  .addChild("paste", ["edit"], {
    name: _lt("Paste"),
    description: "Ctrl+V",
    sequence: 50,
    action: ACTIONS.PASTE_ACTION,
  })
  .addChild("paste_special", ["edit"], {
    name: _lt("Paste special"),
    sequence: 60,
    separator: true,
    isVisible: ACTIONS.IS_NOT_CUT_OPERATION,
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
  .addChild("sort_range", ["data"], {
    name: _lt("Sort range"),
    sequence: 20,
    isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
    separator: true,
  })
  .addChild("sort_ascending", ["data", "sort_range"], {
    name: _lt("Ascending (A ⟶ Z)"),
    sequence: 10,
    action: ACTIONS.SORT_CELLS_ASCENDING,
  })
  .addChild("sort_descending", ["data", "sort_range"], {
    name: _lt("Descending (Z ⟶ A)"),
    sequence: 20,
    action: ACTIONS.SORT_CELLS_DESCENDING,
  })
  .addChild("find_and_replace", ["edit"], {
    name: _lt("Find and replace"),
    description: "Ctrl+H",
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
    isVisible: (env: SpreadsheetChildEnv) =>
      env.model.getters.getHiddenColsGroups(env.model.getters.getActiveSheetId()).length > 0,
  })
  .addChild("edit_unhide_rows", ["edit"], {
    name: _lt("Unhide all rows"),
    sequence: 100,
    action: ACTIONS.UNHIDE_ALL_ROWS_ACTION,
    isVisible: (env: SpreadsheetChildEnv) =>
      env.model.getters.getHiddenRowsGroups(env.model.getters.getActiveSheetId()).length > 0,
  })
  .addChild("insert_row_before", ["insert"], {
    name: ACTIONS.MENU_INSERT_ROWS_BEFORE_NAME,
    sequence: 10,
    action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => env.model.getters.getActiveCols().size === 0,
  })
  .addChild("insert_row_after", ["insert"], {
    name: ACTIONS.MENU_INSERT_ROWS_AFTER_NAME,
    sequence: 20,
    action: ACTIONS.INSERT_ROWS_AFTER_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => env.model.getters.getActiveCols().size === 0,
    separator: true,
  })
  .addChild("insert_column_before", ["insert"], {
    name: ACTIONS.MENU_INSERT_COLUMNS_BEFORE_NAME,
    sequence: 30,
    action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => env.model.getters.getActiveRows().size === 0,
  })
  .addChild("insert_column_after", ["insert"], {
    name: ACTIONS.MENU_INSERT_COLUMNS_AFTER_NAME,
    sequence: 40,
    action: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
    isVisible: (env: SpreadsheetChildEnv) => env.model.getters.getActiveRows().size === 0,
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
  .addChild("insert_image", ["insert"], {
    name: _lt("Image"),
    sequence: 55,
    action: ACTIONS.CREATE_IMAGE,
    isVisible: (env: SpreadsheetChildEnv) => env.imageProvider !== undefined,
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
  .addChild("unfreeze_panes", ["view"], {
    name: _lt("Unfreeze"),
    sequence: 4,
    isVisible: (env) => {
      const { xSplit, ySplit } = env.model.getters.getPaneDivisions(
        env.model.getters.getActiveSheetId()
      );
      return xSplit + ySplit > 0;
    },
    action: (env) =>
      env.model.dispatch("UNFREEZE_COLUMNS_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
      }),
  })
  .addChild("freeze_panes", ["view"], {
    name: _lt("Freeze"),
    sequence: 5,
    separator: true,
  })
  .addChild("unfreeze_rows", ["view", "freeze_panes"], {
    name: _lt("No rows"),
    action: (env) =>
      env.model.dispatch("UNFREEZE_ROWS", {
        sheetId: env.model.getters.getActiveSheetId(),
      }),
    isReadonlyAllowed: true,
    sequence: 5,
    isVisible: (env) =>
      !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).ySplit,
  })
  .addChild("freeze_first_row", ["view", "freeze_panes"], {
    name: _lt("1 row"),
    action: (env) => interactiveFreezeColumnsRows(env, "ROW", 1),
    isReadonlyAllowed: true,
    sequence: 10,
  })
  .addChild("freeze_second_row", ["view", "freeze_panes"], {
    name: _lt("2 rows"),
    action: (env) => interactiveFreezeColumnsRows(env, "ROW", 2),
    isReadonlyAllowed: true,
    sequence: 15,
  })
  .addChild("freeze_current_row", ["view", "freeze_panes"], {
    name: _lt("Up to current row"),
    action: (env) => {
      const { bottom } = env.model.getters.getSelectedZone();
      interactiveFreezeColumnsRows(env, "ROW", bottom + 1);
    },
    isReadonlyAllowed: true,
    sequence: 20,
    separator: true,
  })
  .addChild("unfreeze_columns", ["view", "freeze_panes"], {
    name: _lt("No columns"),
    action: (env) =>
      env.model.dispatch("UNFREEZE_COLUMNS", {
        sheetId: env.model.getters.getActiveSheetId(),
      }),
    isReadonlyAllowed: true,
    sequence: 25,
    isVisible: (env) =>
      !!env.model.getters.getPaneDivisions(env.model.getters.getActiveSheetId()).xSplit,
  })
  .addChild("freeze_first_col", ["view", "freeze_panes"], {
    name: _lt("1 column"),
    action: (env) => interactiveFreezeColumnsRows(env, "COL", 1),
    isReadonlyAllowed: true,
    sequence: 30,
  })
  .addChild("freeze_second_col", ["view", "freeze_panes"], {
    name: _lt("2 columns"),
    action: (env) => interactiveFreezeColumnsRows(env, "COL", 2),
    isReadonlyAllowed: true,
    sequence: 35,
  })
  .addChild("freeze_current_col", ["view", "freeze_panes"], {
    name: _lt("Up to current column"),
    action: (env) => {
      const { right } = env.model.getters.getSelectedZone();
      interactiveFreezeColumnsRows(env, "COL", right + 1);
    },
    isReadonlyAllowed: true,
    sequence: 40,
  })
  .addChild("view_gridlines", ["view"], {
    name: (env: SpreadsheetChildEnv) =>
      env.model.getters.getGridLinesVisibility(env.model.getters.getActiveSheetId())
        ? _lt("Hide gridlines")
        : _lt("Show gridlines"),
    action: ACTIONS.SET_GRID_LINES_VISIBILITY_ACTION,
    sequence: 10,
  })
  .addChild("view_formulas", ["view"], {
    name: (env: SpreadsheetChildEnv) =>
      env.model.getters.shouldShowFormulas() ? _lt("Hide formulas") : _lt("Show formulas"),
    action: ACTIONS.SET_FORMULA_VISIBILITY_ACTION,
    isReadonlyAllowed: true,
    sequence: 15,
  })
  .addChild("format_number", ["format"], {
    name: _lt("Numbers"),
    sequence: 10,
    separator: true,
  })
  .addChild("format_number_automatic", ["format", "format_number"], {
    name: NumberFormatTerms.Automatic,
    sequence: 10,
    separator: true,
    action: ACTIONS.FORMAT_AUTOMATIC_ACTION,
  })
  .addChild("format_number_number", ["format", "format_number"], {
    name: NumberFormatTerms.Number,
    description: "1,000.12",
    sequence: 20,
    action: ACTIONS.FORMAT_NUMBER_ACTION,
  })
  .addChild("format_number_percent", ["format", "format_number"], {
    name: NumberFormatTerms.Percent,
    description: "10.12%",
    sequence: 30,
    separator: true,
    action: ACTIONS.FORMAT_PERCENT_ACTION,
  })
  .addChild("format_number_currency", ["format", "format_number"], {
    name: NumberFormatTerms.Currency,
    description: "$1,000.12",
    sequence: 37,
    action: ACTIONS.FORMAT_CURRENCY_ACTION,
  })
  .addChild("format_number_currency_rounded", ["format", "format_number"], {
    name: NumberFormatTerms.CurrencyRounded,
    description: "$1,000",
    sequence: 38,
    action: ACTIONS.FORMAT_CURRENCY_ROUNDED_ACTION,
  })
  .addChild("format_custom_currency", ["format", "format_number"], {
    name: NumberFormatTerms.CustomCurrency,
    sequence: 39,
    separator: true,
    isVisible: (env) => env.loadCurrencies !== undefined,
    action: ACTIONS.OPEN_CUSTOM_CURRENCY_SIDEPANEL_ACTION,
  })
  .addChild("format_number_date", ["format", "format_number"], {
    name: NumberFormatTerms.Date,
    description: "9/26/2008",
    sequence: 40,
    action: ACTIONS.FORMAT_DATE_ACTION,
  })
  .addChild("format_number_time", ["format", "format_number"], {
    name: NumberFormatTerms.Time,
    description: "10:43:00 PM",
    sequence: 50,
    action: ACTIONS.FORMAT_TIME_ACTION,
  })
  .addChild("format_number_date_time", ["format", "format_number"], {
    name: NumberFormatTerms.DateTime,
    description: "9/26/2008 22:43:00",
    sequence: 60,
    action: ACTIONS.FORMAT_DATE_TIME_ACTION,
  })
  .addChild("format_number_duration", ["format", "format_number"], {
    name: NumberFormatTerms.Duration,
    description: "27:51:38",
    sequence: 70,
    separator: true,
    action: ACTIONS.FORMAT_DURATION_ACTION,
  })
  .addChild("format_bold", ["format"], {
    name: _lt("Bold"),
    sequence: 20,
    description: "Ctrl+B",
    action: ACTIONS.FORMAT_BOLD_ACTION,
  })
  .addChild("format_italic", ["format"], {
    name: _lt("Italic"),
    sequence: 30,
    description: "Ctrl+I",
    action: ACTIONS.FORMAT_ITALIC_ACTION,
  })
  .addChild("format_underline", ["format"], {
    name: _lt("Underline"),
    description: "Ctrl+U",
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
  .addChild("format_alignment", ["format"], {
    name: _lt("Alignment"),
    sequence: 70,
  })
  .addChild("format_alignment_left", ["format", "format_alignment"], {
    name: "Left",
    sequence: 10,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { align: "left" }),
  })
  .addChild("format_alignment_center", ["format", "format_alignment"], {
    name: "Center",
    sequence: 20,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { align: "center" }),
  })
  .addChild("format_alignment_right", ["format", "format_alignment"], {
    name: "Right",
    sequence: 30,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { align: "right" }),
    separator: true,
  })
  .addChild("format_alignment_top", ["format", "format_alignment"], {
    name: "Top",
    sequence: 40,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { verticalAlign: "top" }),
  })
  .addChild("format_alignment_middle", ["format", "format_alignment"], {
    name: "Middle",
    sequence: 50,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { verticalAlign: "middle" }),
  })
  .addChild("format_alignment_bottom", ["format", "format_alignment"], {
    name: "Bottom",
    sequence: 60,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { verticalAlign: "bottom" }),
    separator: true,
  })
  .addChild("format_wrapping", ["format"], {
    name: _lt("Wrapping"),
    sequence: 80,
    separator: true,
  })
  .addChild("format_wrapping_overflow", ["format", "format_wrapping"], {
    name: "Overflow",
    sequence: 10,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { wrapping: "overflow" }),
  })
  .addChild("format_wrapping_wrap", ["format", "format_wrapping"], {
    name: "Wrap",
    sequence: 20,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { wrapping: "wrap" }),
  })
  .addChild("format_wrapping_clip", ["format", "format_wrapping"], {
    name: "Clip",
    sequence: 30,
    action: (env: SpreadsheetChildEnv) => setStyle(env, { wrapping: "clip" }),
  })
  .addChild("format_cf", ["format"], {
    name: _lt("Conditional formatting"),
    sequence: 90,
    action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
    separator: true,
  })
  .addChild("format_clearFormat", ["format"], {
    name: _lt("Clear formatting"),
    sequence: 100,
    action: ACTIONS.FORMAT_CLEARFORMAT_ACTION,
    separator: true,
  })
  .addChild("add_data_filter", ["data"], {
    name: _lt("Create filter"),
    sequence: 10,
    action: ACTIONS.FILTERS_CREATE_FILTER_TABLE,
    isVisible: (env) => !ACTIONS.SELECTION_CONTAINS_FILTER(env),
    isEnabled: (env) => ACTIONS.SELECTION_IS_CONTINUOUS(env),
  })
  .addChild("remove_data_filter", ["data"], {
    name: _lt("Remove filter"),
    sequence: 10,
    action: ACTIONS.FILTERS_REMOVE_FILTER_TABLE,
    isVisible: ACTIONS.SELECTION_CONTAINS_FILTER,
  });

// Font-sizes
for (let fs of fontSizes) {
  topbarMenuRegistry.addChild(`format_font_size_${fs.pt}`, ["format", "format_font_size"], {
    name: fs.pt.toString(),
    sequence: fs.pt,
    action: (env: SpreadsheetChildEnv) => ACTIONS.setStyle(env, { fontSize: fs.pt }),
  });
}
