import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_INSERT from "../../actions/insert_actions";
import { INSERT_LINK_NAME } from "../../actions/menu_items_actions";

//------------------------------------------------------------------------------
// Context Menu Registry
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
    name: _lt("Shift down"),
    sequence: 10,
  })
  .addChild("insert_cell_right", ["insert_cell"], {
    ...ACTION_INSERT.insertCellShiftRight,
    name: _lt("Shift right"),
    sequence: 20,
  })
  .add("delete_row", {
    ...ACTION_EDIT.deleteRow,
    sequence: 110,
    icon: "o-spreadsheet-Icon.DELETE",
  })
  .add("delete_column", {
    ...ACTION_EDIT.deleteCol,
    sequence: 120,
    icon: "o-spreadsheet-Icon.DELETE",
  })
  .add("delete_cell", {
    ...ACTION_EDIT.deleteCells,
    sequence: 130,
    separator: true,
    icon: "o-spreadsheet-Icon.DELETE",
  })
  .addChild("delete_cell_up", ["delete_cell"], {
    ...ACTION_EDIT.deleteCellShiftUp,
    name: _lt("Shift up"),
    sequence: 10,
    icon: "o-spreadsheet-Icon.DELETE_CELL_SHIFT_UP",
  })
  .addChild("delete_cell_left", ["delete_cell"], {
    ...ACTION_EDIT.deleteCellShiftLeft,
    name: _lt("Shift left"),
    sequence: 20,
    icon: "o-spreadsheet-Icon.DELETE_CELL_SHIFT_LEFT",
  })
  .add("insert_link", {
    ...ACTION_INSERT.insertLink,
    name: INSERT_LINK_NAME,
    sequence: 150,
    separator: true,
  });
