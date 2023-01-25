import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTION_EDIT from "./items/edit_menu_items";
import * as ACTION_FORMAT from "./items/format_menu_items";
import * as ACTION_INSERT from "./items/insert_menu_items";
import * as ACTION_VIEW from "./items/view_menu_items";

export const rowMenuRegistry = new MenuItemRegistry();

rowMenuRegistry
  .add("cut", {
    ...ACTION_EDIT.cutMenuItem,
    sequence: 10,
  })
  .add("copy", {
    ...ACTION_EDIT.copyMenuItem,
    sequence: 20,
  })
  .add("paste", {
    ...ACTION_EDIT.pasteMenuItem,
    sequence: 30,
  })
  .add("paste_special", {
    ...ACTION_EDIT.pasteSpecialMenuItem,
    sequence: 40,
    separator: true,
  })
  .addChild("paste_value_only", ["paste_special"], {
    ...ACTION_EDIT.pasteSpecialValueMenuItem,
    sequence: 10,
  })
  .addChild("paste_format_only", ["paste_special"], {
    ...ACTION_EDIT.pasteSpecialFormatMenuItem,
    sequence: 20,
  })
  .add("add_row_before", {
    ...ACTION_INSERT.rowInsertRowBeforeMenuItem,
    sequence: 50,
  })
  .add("add_row_after", {
    ...ACTION_INSERT.rowInsertRowsAfterMenuItem,
    sequence: 60,
  })
  .add("delete_row", {
    ...ACTION_EDIT.deleteRowsMenuItem,
    sequence: 70,
  })
  .add("clear_row", {
    ...ACTION_EDIT.clearRowsMenuItem,
    sequence: 80,
  })
  .add("hide_rows", {
    ...ACTION_VIEW.hideRowsMenuItem,
    sequence: 85,
    separator: true,
  })
  .add("unhide_rows", {
    ...ACTION_VIEW.unhideRowsMenuItem,
    sequence: 86,
    separator: true,
  })
  .add("conditional_formatting", {
    ...ACTION_FORMAT.formatCFMenuItem,
    sequence: 90,
  });
