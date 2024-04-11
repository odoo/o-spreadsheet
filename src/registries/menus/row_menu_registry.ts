import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
import * as ACTION_INSERT from "../../actions/insert_actions";
import * as ACTION_VIEW from "../../actions/view_actions";
import { MenuItemRegistry } from "../menu_items_registry";

export const rowMenuRegistry = new MenuItemRegistry();

rowMenuRegistry
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
    ...ACTION_INSERT.rowInsertRowBefore,
    sequence: 50,
  })
  .add("add_row_after", {
    ...ACTION_INSERT.rowInsertRowsAfter,
    sequence: 60,
  })
  .add("delete_row", {
    ...ACTION_EDIT.deleteRows,
    sequence: 70,
    icon: "o-spreadsheet-Icon.TRASH",
  })
  .add("clear_row", {
    ...ACTION_EDIT.clearRows,
    sequence: 80,
    icon: "o-spreadsheet-Icon.CLEAR",
  })
  .add("hide_rows", {
    ...ACTION_VIEW.hideRows,
    sequence: 85,
    separator: true,
  })
  .add("unhide_rows", {
    ...ACTION_VIEW.unhideRows,
    sequence: 86,
    separator: true,
  })
  .add("conditional_formatting", {
    ...ACTION_FORMAT.formatCF,
    sequence: 90,
    separator: true,
  })
  .add("group_rows", {
    sequence: 100,
    ...ACTION_VIEW.groupRows,
  })
  .add("ungroup_rows", {
    sequence: 110,
    ...ACTION_VIEW.ungroupRows,
    isVisible: (env) => ACTION_VIEW.canUngroupHeaders(env, "ROW"),
  });
