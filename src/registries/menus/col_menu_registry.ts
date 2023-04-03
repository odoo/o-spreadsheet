import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTION_DATA from "./items/data_menu_items";
import * as ACTION_EDIT from "./items/edit_menu_items";
import * as ACTION_FORMAT from "./items/format_menu_items";
import * as ACTION_INSERT from "./items/insert_menu_items";
import * as ACTION_VIEW from "./items/view_menu_items";

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
      env.model.getters.getActiveCols().size > 1 ? _lt("Sort columns") : _lt("Sort column"),
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
  })
  .add("clear_column", {
    ...ACTION_EDIT.clearCols,
    sequence: 100,
  })
  .add("hide_columns", {
    ...ACTION_VIEW.hideCols,
    sequence: 85,
    separator: true,
  })
  .add("unhide_columns", {
    ...ACTION_VIEW.unhideCols,
    sequence: 86,
    separator: true,
  })
  .add("conditional_formatting", {
    ...ACTION_FORMAT.formatCF,
    sequence: 110,
  });
