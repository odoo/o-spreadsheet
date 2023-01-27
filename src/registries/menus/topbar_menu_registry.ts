import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTION_DATA from "./items/data_menu_items";
import * as ACTION_EDIT from "./items/edit_menu_items";
import * as ACTION_FORMAT from "./items/format_menu_items";
import * as ACTION_INSERT from "./items/insert_menu_items";
import * as ACTION_VIEW from "./items/view_menu_items";
import { formatNumberMenuItemSpec } from "./number_format_menu_registry";

export const topbarMenuRegistry = new MenuItemRegistry();

topbarMenuRegistry

  // ---------------------------------------------------------------------
  // FILE MENU ITEMS
  // ---------------------------------------------------------------------

  .add("file", {
    name: _lt("File"),
    sequence: 10,
  })

  // ---------------------------------------------------------------------
  // EDIT MENU ITEMS
  // ---------------------------------------------------------------------

  .add("edit", {
    name: _lt("Edit"),
    sequence: 20,
  })
  .addChild("undo", ["edit"], {
    ...ACTION_EDIT.undoMenuItem,
    sequence: 10,
  })
  .addChild("redo", ["edit"], {
    ...ACTION_EDIT.redoMenuItem,
    sequence: 20,
    separator: true,
  })
  .addChild("copy", ["edit"], {
    ...ACTION_EDIT.copyMenuItem,
    sequence: 30,
  })
  .addChild("cut", ["edit"], {
    ...ACTION_EDIT.cutMenuItem,
    sequence: 40,
  })
  .addChild("paste", ["edit"], {
    ...ACTION_EDIT.pasteMenuItem,
    sequence: 50,
  })
  .addChild("paste_special", ["edit"], {
    ...ACTION_EDIT.pasteSpecialMenuItem,
    sequence: 60,
    separator: true,
  })
  .addChild("paste_special_value", ["edit", "paste_special"], {
    ...ACTION_EDIT.pasteSpecialValueMenuItem,
    sequence: 10,
  })
  .addChild("paste_special_format", ["edit", "paste_special"], {
    ...ACTION_EDIT.pasteSpecialFormatMenuItem,
    sequence: 20,
  })
  .addChild("find_and_replace", ["edit"], {
    ...ACTION_EDIT.findAndReplaceMenuItem,
    sequence: 65,
    separator: true,
  })
  .addChild("edit_delete_cell_values", ["edit"], {
    ...ACTION_EDIT.deleteValuesMenuItem,
    sequence: 70,
  })
  .addChild("edit_delete_row", ["edit"], {
    ...ACTION_EDIT.deleteRowsMenuItem,
    sequence: 80,
  })
  .addChild("edit_delete_column", ["edit"], {
    ...ACTION_EDIT.deleteColsMenuItem,
    sequence: 90,
  })
  .addChild("edit_delete_cell_shift_up", ["edit"], {
    ...ACTION_EDIT.deleteCellShiftUpMenuItem,
    sequence: 93,
  })
  .addChild("edit_delete_cell_shift_left", ["edit"], {
    ...ACTION_EDIT.deleteCellShiftLeftMenuItem,
    sequence: 97,
  })
  .addChild("edit_unhide_columns", ["edit"], {
    ...ACTION_VIEW.unhideAllColsMenuItem,
    sequence: 100,
  })
  .addChild("edit_unhide_rows", ["edit"], {
    ...ACTION_VIEW.unhideAllRowsMenuItem,
    sequence: 100,
  })

  // ---------------------------------------------------------------------
  // VIEW MENU ITEMS
  // ---------------------------------------------------------------------

  .add("view", {
    name: _lt("View"),
    sequence: 30,
  })
  .addChild("unfreeze_panes", ["view"], {
    ...ACTION_VIEW.unFreezePaneMenuItem,
    sequence: 4,
  })
  .addChild("freeze_panes", ["view"], {
    ...ACTION_VIEW.freezePaneMenuItem,
    sequence: 5,
    separator: true,
  })
  .addChild("unfreeze_rows", ["view", "freeze_panes"], {
    ...ACTION_VIEW.unFreezeRowsMenuItem,
    sequence: 5,
  })
  .addChild("freeze_first_row", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeFirstRowMenuItem,
    sequence: 10,
  })
  .addChild("freeze_second_row", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeSecondRowMenuItem,
    sequence: 15,
  })
  .addChild("freeze_current_row", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeCurrentRowMenuItem,
    sequence: 20,
    separator: true,
  })
  .addChild("unfreeze_columns", ["view", "freeze_panes"], {
    ...ACTION_VIEW.unFreezeColsMenuItem,
    sequence: 25,
  })
  .addChild("freeze_first_col", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeFirstColMenuItem,
    sequence: 30,
  })
  .addChild("freeze_second_col", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeSecondColMenuItem,
    sequence: 35,
  })
  .addChild("freeze_current_col", ["view", "freeze_panes"], {
    ...ACTION_VIEW.freezeCurrentColMenuItem,
    sequence: 40,
  })
  .addChild("view_gridlines", ["view"], {
    ...ACTION_VIEW.viewGridlinesMenuItem,
    sequence: 10,
  })
  .addChild("view_formulas", ["view"], {
    ...ACTION_VIEW.viewFormulasMenuItem,
    sequence: 15,
  })

  // ---------------------------------------------------------------------
  // INSERT MENU ITEMS
  // ---------------------------------------------------------------------

  .add("insert", {
    name: _lt("Insert"),
    sequence: 40,
  })
  .addChild("insert_row_before", ["insert"], {
    ...ACTION_INSERT.topBarInsertRowsBeforeMenuItem,
    sequence: 10,
  })
  .addChild("insert_row_after", ["insert"], {
    ...ACTION_INSERT.topBarInsertRowsAfterMenuItem,
    sequence: 20,
    separator: true,
  })
  .addChild("insert_column_before", ["insert"], {
    ...ACTION_INSERT.topBarInsertColsBeforeMenuItem,
    sequence: 30,
  })
  .addChild("insert_column_after", ["insert"], {
    ...ACTION_INSERT.topBarInsertColsAfterMenuItem,
    sequence: 40,
    separator: true,
  })
  .addChild("insert_insert_cell_shift_down", ["insert"], {
    ...ACTION_INSERT.insertCellShiftDownMenuItem,
    sequence: 43,
  })
  .addChild("insert_insert_cell_shift_right", ["insert"], {
    ...ACTION_INSERT.insertCellShiftRightMenuItem,
    sequence: 47,
    separator: true,
  })
  .addChild("insert_chart", ["insert"], {
    ...ACTION_INSERT.insertChartMenuItem,
    sequence: 50,
  })
  .addChild("insert_image", ["insert"], {
    ...ACTION_INSERT.insertImageMenuItem,
    sequence: 55,
  })
  .addChild("insert_function", ["insert"], {
    ...ACTION_INSERT.insertFunctionMenuItem,
    sequence: 60,
  })
  .addChild("insert_function_sum", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionSumMenuItem,
    sequence: 0,
  })
  .addChild("insert_function_average", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionAverageMenuItem,
    sequence: 10,
  })
  .addChild("insert_function_count", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionCountMenuItem,
    sequence: 20,
  })
  .addChild("insert_function_max", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionMaxMenuItem,
    sequence: 30,
  })
  .addChild("insert_function_min", ["insert", "insert_function"], {
    ...ACTION_INSERT.insertFunctionMinMenuItem,
    sequence: 40,
    separator: true,
  })
  .addChild("categorie_function_all", ["insert", "insert_function"], {
    ...ACTION_INSERT.categorieFunctionAllMenuItem,
    sequence: 50,
  })
  .addChild(
    "categories_function_list",
    ["insert", "insert_function"],
    ACTION_INSERT.categoriesFunctionListMenuBuilder
  )
  .addChild("insert_link", ["insert"], {
    ...ACTION_INSERT.insertLinkMenuItem,
    separator: true,
    sequence: 70,
  })
  .addChild("insert_sheet", ["insert"], {
    ...ACTION_INSERT.insertSheetMenuItem,
    sequence: 80,
    separator: true,
  })

  // ---------------------------------------------------------------------
  // FORMAT MENU ITEMS
  // ---------------------------------------------------------------------

  .add("format", { name: _lt("Format"), sequence: 50 })
  .addChild("format_number", ["format"], {
    ...formatNumberMenuItemSpec,
    name: _lt("Number"),
    sequence: 10,
    separator: true,
  })
  .addChild("format_bold", ["format"], {
    ...ACTION_FORMAT.formatBoldMenuItem,
    sequence: 20,
  })
  .addChild("format_italic", ["format"], {
    ...ACTION_FORMAT.formatItalicMenuItem,
    sequence: 30,
  })
  .addChild("format_underline", ["format"], {
    ...ACTION_FORMAT.formatUnderlineMenuItem,
    sequence: 40,
  })
  .addChild("format_strikethrough", ["format"], {
    ...ACTION_FORMAT.formatStrikethroughMenuItem,
    sequence: 50,
    separator: true,
  })
  .addChild("format_font_size", ["format"], {
    ...ACTION_FORMAT.formatFontSizeMenuItem,
    sequence: 60,
    separator: true,
  })
  .addChild("format_alignment", ["format"], {
    ...ACTION_FORMAT.formatAlignmentMenuItem,
    sequence: 70,
  })
  .addChild("format_alignment_left", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentLeftMenuItem,
    sequence: 10,
  })
  .addChild("format_alignment_center", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentCenterMenuItem,
    sequence: 20,
  })
  .addChild("format_alignment_right", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentRightMenuItem,
    sequence: 30,
    separator: true,
  })
  .addChild("format_alignment_top", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentTopMenuItem,
    sequence: 40,
  })
  .addChild("format_alignment_middle", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentMiddleMenuItem,
    sequence: 50,
  })
  .addChild("format_alignment_bottom", ["format", "format_alignment"], {
    ...ACTION_FORMAT.formatAlignmentBottomMenuItem,
    sequence: 60,
    separator: true,
  })
  .addChild("format_wrapping", ["format"], {
    ...ACTION_FORMAT.formatWrappingMenuItem,
    sequence: 80,
    separator: true,
  })
  .addChild("format_wrapping_overflow", ["format", "format_wrapping"], {
    ...ACTION_FORMAT.formatWrappingOverflowMenuItem,
    sequence: 10,
  })
  .addChild("format_wrapping_wrap", ["format", "format_wrapping"], {
    ...ACTION_FORMAT.formatWrappingWrapMenuItem,
    sequence: 20,
  })
  .addChild("format_wrapping_clip", ["format", "format_wrapping"], {
    ...ACTION_FORMAT.formatWrappingClipMenuItem,
    sequence: 30,
  })
  .addChild("format_cf", ["format"], {
    ...ACTION_FORMAT.formatCFMenuItem,
    sequence: 90,
    separator: true,
  })
  .addChild("format_clearFormat", ["format"], {
    ...ACTION_FORMAT.clearFormatMenuItem,
    sequence: 100,
    separator: true,
  })

  // ---------------------------------------------------------------------
  // DATA MENU ITEMS
  // ---------------------------------------------------------------------

  .add("data", {
    name: _lt("Data"),
    sequence: 60,
  })
  .addChild("sort_range", ["data"], {
    ...ACTION_DATA.sortRangeMenuItem,
    sequence: 20,
    separator: true,
  })
  .addChild("sort_ascending", ["data", "sort_range"], {
    ...ACTION_DATA.sortAscendingenuItem,
    sequence: 10,
  })
  .addChild("sort_descending", ["data", "sort_range"], {
    ...ACTION_DATA.sortDescendingMenuItem,
    sequence: 20,
  })
  .addChild("add_data_filter", ["data"], {
    ...ACTION_DATA.addDataFilterMenuItem,
    sequence: 10,
  })
  .addChild("remove_data_filter", ["data"], {
    ...ACTION_DATA.removeDataFilterMenuItem,
    sequence: 10,
  });
