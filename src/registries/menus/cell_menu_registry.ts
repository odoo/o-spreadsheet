import { _t } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_INSERT from "../../actions/insert_actions";
import * as ACTIONS from "../../actions/menu_items_actions";
import * as ACTIONS_PIVOT from "../../helpers/pivot/pivot_menu_items";

//------------------------------------------------------------------------------
// Context MenuPopover Registry
//------------------------------------------------------------------------------

export const cellMenuRegistry = new MenuItemRegistry();

cellMenuRegistry
  .add("cut", {
    ...ACTION_EDIT.cut,
    sequence: 10,
  })
  .add("copy", {
    ...ACTION_EDIT.copy,
    sequence: 20,
  })
  .add("paste", {
    ...ACTION_EDIT.paste,
    sequence: 30,
  })
  .add("paste_special", {
    ...ACTION_EDIT.pasteSpecial,
    sequence: 40,
    separator: true,
  })
  .addChild("paste_value_only", ["paste_special"], {
    ...ACTION_EDIT.pasteSpecialValue,
    sequence: 10,
  })
  .addChild("paste_format_only", ["paste_special"], {
    ...ACTION_EDIT.pasteSpecialFormat,
    sequence: 20,
  })
  .add("add_row_before", {
    ...ACTION_INSERT.cellInsertRowsBefore,
    sequence: 70,
  })
  .add("add_column_before", {
    ...ACTION_INSERT.cellInsertColsBefore,
    sequence: 90,
  })
  .add("insert_cell", {
    ...ACTION_INSERT.insertCell,
    sequence: 100,
    separator: true,
  })
  .addChild("insert_cell_down", ["insert_cell"], {
    ...ACTION_INSERT.insertCellShiftDown,
    name: _t("Shift down"),
    sequence: 10,
  })
  .addChild("insert_cell_right", ["insert_cell"], {
    ...ACTION_INSERT.insertCellShiftRight,
    name: _t("Shift right"),
    sequence: 20,
  })
  .add("delete_row", {
    ...ACTION_EDIT.deleteRow,
    sequence: 110,
    icon: "o-spreadsheet-Icon.TRASH",
  })
  .add("delete_column", {
    ...ACTION_EDIT.deleteCol,
    sequence: 120,
    icon: "o-spreadsheet-Icon.TRASH",
  })
  .add("delete_cell", {
    ...ACTION_EDIT.deleteCells,
    sequence: 130,
    separator: true,
    icon: "o-spreadsheet-Icon.TRASH",
  })
  .addChild("delete_cell_up", ["delete_cell"], {
    ...ACTION_EDIT.deleteCellShiftUp,
    name: _t("Shift up"),
    sequence: 10,
    icon: "o-spreadsheet-Icon.DELETE_CELL_SHIFT_UP",
  })
  .addChild("delete_cell_left", ["delete_cell"], {
    ...ACTION_EDIT.deleteCellShiftLeft,
    name: _t("Shift left"),
    sequence: 20,
    icon: "o-spreadsheet-Icon.DELETE_CELL_SHIFT_LEFT",
  })
  .add("edit_table", {
    ...ACTION_EDIT.editTable,
    isVisible: ACTIONS.SELECTION_CONTAINS_SINGLE_TABLE,
    isEnabled: (env) => !env.isSmall,
    sequence: 140,
  })
  .add("delete_table", {
    ...ACTION_EDIT.deleteTable,
    isVisible: ACTIONS.SELECTION_CONTAINS_SINGLE_TABLE,
    sequence: 145,
    separator: true,
  })
  .add("insert_link", {
    ...ACTION_INSERT.insertLink,
    name: ACTIONS.INSERT_LINK_NAME,
    sequence: 150,
    separator: true,
  })
  .add("pivot_headers_group", {
    sequence: 155,
    icon: "o-spreadsheet-Icon.PLUS_IN_BOX",
    ...ACTIONS_PIVOT.groupPivotHeaders,
  })
  .add("pivot_group_remaining", {
    sequence: 155,
    icon: "o-spreadsheet-Icon.PLUS_IN_BOX",
    ...ACTIONS_PIVOT.groupRemainingPivotHeadersAction,
  })
  .add("pivot_headers_ungroup", {
    sequence: 155,
    icon: "o-spreadsheet-Icon.MINUS_IN_BOX",
    ...ACTIONS_PIVOT.ungroupPivotHeadersAction,
  })
  .add("collapse_pivot", {
    sequence: 156,
    name: _t("Expand/Collapse"),
    icon: "o-spreadsheet-Icon.COLLAPSE_PIVOT",
  })
  .addChild("toggle_collapse_pivot_cell", ["collapse_pivot"], {
    sequence: 10,
    ...ACTIONS_PIVOT.collapsePivotGroupAction,
  })
  .addChild("collapse_all_pivot", ["collapse_pivot"], {
    sequence: 20,
    ...ACTIONS_PIVOT.collapseAllPivotGroupAction,
  })
  .addChild("expand_all_pivot", ["collapse_pivot"], {
    sequence: 30,
    ...ACTIONS_PIVOT.expandAllPivotGroupAction,
  })
  .add("pivot_sorting", {
    name: _t("Sort pivot"),
    sequence: 155,
    icon: "o-spreadsheet-Icon.SORT_RANGE",
    isVisible: (env) => {
      const position = env.model.getters.getActivePosition();
      return ACTIONS_PIVOT.canSortPivot(env.model.getters, position);
    },
  })
  .add("pivot_fix_formulas", {
    ...ACTIONS_PIVOT.FIX_FORMULAS,
    sequence: 160,
  })
  .add("pivot_properties", {
    ...ACTIONS_PIVOT.pivotProperties,
    sequence: 170,
    separator: true,
  })
  .addChild("pivot_sorting_asc", ["pivot_sorting"], {
    ...ACTIONS_PIVOT.pivotSortingAsc,
    sequence: 10,
  })
  .addChild("pivot_sorting_desc", ["pivot_sorting"], {
    ...ACTIONS_PIVOT.pivotSortingDesc,
    sequence: 20,
  })
  .addChild("pivot_sorting_none", ["pivot_sorting"], {
    ...ACTIONS_PIVOT.noPivotSorting,
    sequence: 30,
  });
