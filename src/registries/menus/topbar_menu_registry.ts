import * as ACTION_DATA from "../../actions/data_actions";
import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
import * as ACTION_INSERT from "../../actions/insert_actions";
import * as ACTION_VIEW from "../../actions/view_actions";
import { _t } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";
import { formatNumberMenuItemSpec } from "./number_format_menu_registry";

export const topbarMenuRegistry = new MenuItemRegistry();

topbarMenuRegistry

  // ---------------------------------------------------------------------
  // FILE MENU ITEMS
  // ---------------------------------------------------------------------

  .add("file", {
    name: _t("File"),
    sequence: 10,
  })
  .addChild("settings", ["file"], {
    name: _t("Settings"),
    sequence: 100,
    execute: (env) => env.openSidePanel("Settings"),
    icon: "o-spreadsheet-Icon.COG",
  })

  // ---------------------------------------------------------------------
  // EDIT MENU ITEMS
  // ---------------------------------------------------------------------

  .add("edit", {
    name: _t("Edit"),
    sequence: 20,
  })
  .addChild("undo", ["edit"], {
    ...ACTION_EDIT.undo,
    sequence: 10,
  })
  .addChild("redo", ["edit"], {
    ...ACTION_EDIT.redo,
    sequence: 20,
    separator: true,
  })
  .addChild("copy", ["edit"], {
    ...ACTION_EDIT.copy,
    sequence: 30,
  })
  .addChild("cut", ["edit"], {
    ...ACTION_EDIT.cut,
    sequence: 40,
  })
  .addChild("paste", ["edit"], {
    ...ACTION_EDIT.paste,
    sequence: 50,
  })
  .addChild("paste_special", ["edit"], {
    ...ACTION_EDIT.pasteSpecial,
    sequence: 60,
    separator: true,
  })
  .addChild("paste_special_value", ["edit", "paste_special"], {
    ...ACTION_EDIT.pasteSpecialValue,
    sequence: 10,
  })
  .addChild("paste_special_format", ["edit", "paste_special"], {
    ...ACTION_EDIT.pasteSpecialFormat,
    sequence: 20,
  })
  .addChild("find_and_replace", ["edit"], {
    ...ACTION_EDIT.findAndReplace,
    sequence: 65,
    separator: true,
  })
  .addChild("delete", ["edit"], {
    name: _t("Delete"),
    icon: "o-spreadsheet-Icon.DELETE",
    sequence: 70,
  })
  .addChild("edit_delete_cell_values", ["edit", "delete"], {
    ...ACTION_EDIT.deleteValues,
    sequence: 10,
  })
  .addChild("edit_delete_row", ["edit", "delete"], {
    ...ACTION_EDIT.deleteRows,
    sequence: 20,
  })
  .addChild("edit_delete_column", ["edit", "delete"], {
    ...ACTION_EDIT.deleteCols,
    sequence: 30,
  })
  .addChild("edit_delete_cell_shift_up", ["edit", "delete"], {
    ...ACTION_EDIT.deleteCellShiftUp,
    sequence: 40,
  })
  .addChild("edit_delete_cell_shift_left", ["edit", "delete"], {
    ...ACTION_EDIT.deleteCellShiftLeft,
    sequence: 50,
  })
  .addChild("edit_unhide_columns", ["edit"], {
    ...ACTION_VIEW.unhideAllCols,
    sequence: 80,
  })
  .addChild("edit_unhide_rows", ["edit"], {
    ...ACTION_VIEW.unhideAllRows,
    sequence: 80,
  })

  // ---------------------------------------------------------------------
  // VIEW MENU ITEMS
  // ---------------------------------------------------------------------

  .add("view", {
    name: _t("View"),
    sequence: 30,
  })
  .addChild("unfreeze_panes", ["view"], {
    ...ACTION_VIEW.unFreezePane,
    sequence: 4,
  })
  .addChild("freeze_panes", ["view"], {
    ...ACTION_VIEW.freezePane,
    sequence: 5,
    separator: true,
  })
  .addChild("unfreeze_rows", ["view", "freeze_panes"], {
    ...ACTION_VIEW.unFreezeRows,
    sequence: 5,
  })
  .addChild("freeze_first_row", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeFirstRow,
    sequence: 10,
  })
  .addChild("freeze_second_row", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeSecondRow,
    sequence: 15,
  })
  .addChild("freeze_current_row", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeCurrentRow,
    sequence: 20,
    separator: true,
  })
  .addChild("unfreeze_columns", ["view", "freeze_panes"], {
    ...ACTION_VIEW.unFreezeCols,
    sequence: 25,
  })
  .addChild("freeze_first_col", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeFirstCol,
    sequence: 30,
  })
  .addChild("freeze_second_col", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeSecondCol,
    sequence: 35,
  })
  .addChild("freeze_current_col", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeCurrentCol,
    sequence: 40,
  })
  .addChild("view_gridlines", ["view"], {
    ...ACTION_VIEW.viewGridlines,
    sequence: 10,
  })
  .addChild("view_formulas", ["view"], {
    ...ACTION_VIEW.viewFormulas,
    sequence: 15,
  })

  // ---------------------------------------------------------------------
  // INSERT MENU ITEMS
  // ---------------------------------------------------------------------

  .add("insert", {
    name: _t("Insert"),
    sequence: 40,
  })
  .addChild("insert_row", ["insert"], {
    ...ACTION_INSERT.insertRow,
    sequence: 10,
  })
  .addChild("insert_row_before", ["insert", "insert_row"], {
    ...ACTION_INSERT.topBarInsertRowsBefore,
    sequence: 10,
  })
  .addChild("insert_row_after", ["insert", "insert_row"], {
    ...ACTION_INSERT.topBarInsertRowsAfter,
    sequence: 20,
  })
  .addChild("insert_column", ["insert"], {
    ...ACTION_INSERT.insertCol,
    sequence: 20,
  })
  .addChild("insert_column_before", ["insert", "insert_column"], {
    ...ACTION_INSERT.topBarInsertColsBefore,
    sequence: 10,
  })
  .addChild("insert_column_after", ["insert", "insert_column"], {
    ...ACTION_INSERT.topBarInsertColsAfter,
    sequence: 20,
  })
  .addChild("insert_cell", ["insert"], {
    ...ACTION_INSERT.insertCell,
    sequence: 43,
  })
  .addChild("insert_cell_down", ["insert", "insert_cell"], {
    ...ACTION_INSERT.insertCellShiftDown,
    name: _t("Shift down"),
    sequence: 10,
  })
  .addChild("insert_cell_right", ["insert", "insert_cell"], {
    ...ACTION_INSERT.insertCellShiftRight,
    name: _t("Shift right"),
    sequence: 20,
  })
  .addChild("insert_sheet", ["insert"], {
    ...ACTION_INSERT.insertSheet,
    sequence: 80,
    separator: true,
  })
  .addChild("insert_chart", ["insert"], {
    ...ACTION_INSERT.insertChart,
    sequence: 50,
  })
  .addChild("insert_image", ["insert"], {
    ...ACTION_INSERT.insertImage,
    sequence: 55,
  })
  .addChild("insert_function", ["insert"], {
    ...ACTION_INSERT.insertFunction,
    sequence: 60,
  })
  .addChild("insert_function_sum", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionSum,
    sequence: 0,
  })
  .addChild("insert_function_average", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionAverage,
    sequence: 10,
  })
  .addChild("insert_function_count", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionCount,
    sequence: 20,
  })
  .addChild("insert_function_max", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionMax,
    sequence: 30,
  })
  .addChild("insert_function_min", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionMin,
    sequence: 40,
    separator: true,
  })
  .addChild("categorie_function_all", ["insert", "insert_function"], {
    ...ACTION_INSERT.categorieFunctionAll,
    sequence: 50,
  })
  .addChild(
    "categories_function_list",
    ["insert", "insert_function"],
    ACTION_INSERT.categoriesFunctionListMenuBuilder
  )
  .addChild("insert_link", ["insert"], {
    ...ACTION_INSERT.insertLink,
    separator: true,
    sequence: 70,
  })

  // ---------------------------------------------------------------------
  // FORMAT MENU ITEMS
  // ---------------------------------------------------------------------

  .add("format", { name: _t("Format"), sequence: 50 })
  .addChild("format_number", ["format"], {
    ...formatNumberMenuItemSpec,
    name: _t("Number"),
    sequence: 10,
    separator: true,
  })
  .addChild("format_bold", ["format"], {
    ...ACTION_FORMAT.formatBold,
    sequence: 20,
  })
  .addChild("format_italic", ["format"], {
    ...ACTION_FORMAT.formatItalic,
    sequence: 30,
  })
  .addChild("format_underline", ["format"], {
    ...ACTION_FORMAT.formatUnderline,
    sequence: 40,
  })
  .addChild("format_strikethrough", ["format"], {
    ...ACTION_FORMAT.formatStrikethrough,
    sequence: 50,
    separator: true,
  })
  .addChild("format_font_size", ["format"], {
    ...ACTION_FORMAT.formatFontSize,
    sequence: 60,
    separator: true,
  })
  .addChild("format_alignment", ["format"], {
    ...ACTION_FORMAT.formatAlignment,
    sequence: 70,
  })
  .addChild("format_alignment_left", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentLeft,
    sequence: 10,
  })
  .addChild("format_alignment_center", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentCenter,
    sequence: 20,
  })
  .addChild("format_alignment_right", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentRight,
    sequence: 30,
    separator: true,
  })
  .addChild("format_alignment_top", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentTop,
    sequence: 40,
  })
  .addChild("format_alignment_middle", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentMiddle,
    sequence: 50,
  })
  .addChild("format_alignment_bottom", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentBottom,
    sequence: 60,
    separator: true,
  })
  .addChild("format_wrapping", ["format"], {
    ...ACTION_FORMAT.formatWrappingIcon,
    sequence: 80,
    separator: true,
  })
  .addChild("format_wrapping_overflow", ["format", "format_wrapping"], {
    ...ACTION_FORMAT.formatWrappingOverflow,
    sequence: 10,
  })
  .addChild("format_wrapping_wrap", ["format", "format_wrapping"], {
    ...ACTION_FORMAT.formatWrappingWrap,
    sequence: 20,
  })
  .addChild("format_wrapping_clip", ["format", "format_wrapping"], {
    ...ACTION_FORMAT.formatWrappingClip,
    sequence: 30,
  })
  .addChild("format_cf", ["format"], {
    ...ACTION_FORMAT.formatCF,
    sequence: 90,
    separator: true,
  })
  .addChild("format_clearFormat", ["format"], {
    ...ACTION_FORMAT.clearFormat,
    sequence: 100,
    separator: true,
  })

  // ---------------------------------------------------------------------
  // DATA MENU ITEMS
  // ---------------------------------------------------------------------

  .add("data", {
    name: _t("Data"),
    sequence: 60,
  })
  .addChild("sort_range", ["data"], {
    ...ACTION_DATA.sortRange,
    sequence: 10,
    separator: true,
  })
  .addChild("sort_ascending", ["data", "sort_range"], {
    ...ACTION_DATA.sortAscending,
    sequence: 10,
  })
  .addChild("sort_descending", ["data", "sort_range"], {
    ...ACTION_DATA.sortDescending,
    sequence: 20,
  })
  .addChild("split_to_columns", ["data"], {
    ...ACTION_DATA.splitToColumns,
    sequence: 20,
    separator: true,
  })
  .addChild("add_data_filter", ["data"], {
    ...ACTION_DATA.addDataFilter,
    sequence: 30,
  })
  .addChild("remove_data_filter", ["data"], {
    ...ACTION_DATA.removeDataFilter,
    sequence: 30,
  });
