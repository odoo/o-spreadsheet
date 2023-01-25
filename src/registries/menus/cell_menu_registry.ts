import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

import * as ACTION_EDIT from "./items/edit_menu_items";
import * as ACTION_INSERT from "./items/insert_menu_items";

//------------------------------------------------------------------------------
// Context Menu Registry
//------------------------------------------------------------------------------

export const cellMenuRegistry = new MenuItemRegistry();

cellMenuRegistry
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
    ...ACTION_INSERT.cellInsertRowsBeforeMenuItem,
    sequence: 70,
  })
  .add("add_column_before", {
    ...ACTION_INSERT.cellInsertColsBeforeMenuItem,
    sequence: 90,
  })
  .add("insert_cell", {
    ...ACTION_INSERT.insertCellMenuItem,
    sequence: 100,
    separator: true,
  })
  .addChild("insert_cell_down", ["insert_cell"], {
    ...ACTION_INSERT.insertCellShiftDownMenuItem,
    name: _lt("Shift down"),
    sequence: 10,
  })
  .addChild("insert_cell_right", ["insert_cell"], {
    ...ACTION_INSERT.insertCellShiftRightMenuItem,
    name: _lt("Shift right"),
    sequence: 20,
  })
  .add("delete_row", {
    ...ACTION_EDIT.deleteRowMenuItem,
    sequence: 110,
  })
  .add("delete_column", {
    ...ACTION_EDIT.deleteColMenuItem,
    sequence: 120,
  })
  .add("delete_cell", {
    ...ACTION_EDIT.deleteCellsMenuItem,
    sequence: 130,
  })
  .addChild("delete_cell_up", ["delete_cell"], {
    ...ACTION_EDIT.deleteCellShiftUpMenuItem,
    name: _lt("Shift up"),
    sequence: 10,
  })
  .addChild("delete_cell_left", ["delete_cell"], {
    ...ACTION_EDIT.deleteCellShiftLeftMenuItem,
    name: _lt("Shift left"),
    sequence: 20,
  })
  .add("insert_link", {
    ...ACTION_INSERT.insertLinkMenuItem,
    name: _lt("Insert link"),
    sequence: 150,
    separator: true,
  });
