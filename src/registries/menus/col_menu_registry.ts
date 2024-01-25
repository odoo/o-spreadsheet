import * as ACTION_DATA from "../../actions/data_actions";
import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
import * as ACTION_INSERT from "../../actions/insert_actions";
import * as ACTIONS from "../../actions/menu_items_actions";
import * as ACTION_VIEW from "../../actions/view_actions";
import { _t } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

export const colMenuRegistry = new MenuItemRegistry();

colMenuRegistry
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
  .add("sort_columns", {
    ...ACTION_DATA.sortRange,
    name: (env) =>
      env.model.getters.getActiveCols().size > 1 ? _t("Sort columns") : _t("Sort column"),
    sequence: 50,
    separator: true,
  })
  .addChild("sort_ascending", ["sort_columns"], {
    ...ACTION_DATA.sortAscending,
    sequence: 10,
  })
  .addChild("sort_descending", ["sort_columns"], {
    ...ACTION_DATA.sortDescending,
    sequence: 20,
  })
  .add("add_column_before", {
    ...ACTION_INSERT.colInsertColsBefore,
    sequence: 70,
  })
  .add("add_column_after", {
    ...ACTION_INSERT.colInsertColsAfter,
    sequence: 80,
  })
  .add("delete_column", {
    ...ACTION_EDIT.deleteCols,
    sequence: 90,
    icon: "o-spreadsheet-Icon.DELETE",
  })
  .add("clear_column", {
    ...ACTION_EDIT.clearCols,
    sequence: 100,
    icon: "o-spreadsheet-Icon.CLEAR",
  })
  .add("hide_columns", {
    ...ACTION_VIEW.hideCols,
    sequence: 105,
    separator: true,
  })
  .add("unhide_columns", {
    ...ACTION_VIEW.unhideCols,
    sequence: 106,
    separator: true,
  })
  .add("conditional_formatting", {
    ...ACTION_FORMAT.formatCF,
    sequence: 110,
    separator: true,
  })
  .add("edit_table", {
    ...ACTION_EDIT.editTable,
    isVisible: ACTIONS.SELECTION_CONTAINS_SINGLE_TABLE,
    sequence: 120,
  })
  .add("delete_table", {
    ...ACTION_EDIT.deleteTable,
    isVisible: ACTIONS.SELECTION_CONTAINS_SINGLE_TABLE,
    sequence: 125,
    separator: true,
  })
  .add("group_columns", {
    sequence: 150,
    ...ACTION_VIEW.groupColumns,
  })
  .add("ungroup_columns", {
    sequence: 155,
    ...ACTION_VIEW.ungroupColumns,
    isVisible: (env) => ACTION_VIEW.canUngroupHeaders(env, "COL"),
  });
