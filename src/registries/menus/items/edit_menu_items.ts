import { _lt } from "../../../translation";
import { MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const undoMenuItem: MenuItemSpec = {
  name: _lt("Undo"),
  description: "Ctrl+Z",
  action: ACTIONS.UNDO_ACTION,
  icon: "o-spreadsheet-Icon.UNDO",
};

export const redoMenuItem: MenuItemSpec = {
  name: _lt("Redo"),
  description: "Ctrl+Y",
  action: ACTIONS.REDO_ACTION,
  icon: "o-spreadsheet-Icon.REDO",
};

export const copyMenuItem: MenuItemSpec = {
  name: _lt("Copy"),
  description: "Ctrl+C",
  isReadonlyAllowed: true,
  action: ACTIONS.COPY_ACTION,
};

export const cutMenuItem: MenuItemSpec = {
  name: _lt("Cut"),
  description: "Ctrl+X",
  action: ACTIONS.CUT_ACTION,
};

export const pasteMenuItem: MenuItemSpec = {
  name: _lt("Paste"),
  description: "Ctrl+V",
  action: ACTIONS.PASTE_ACTION,
};

export const pasteSpecialMenuItem: MenuItemSpec = {
  name: _lt("Paste special"),
  isVisible: ACTIONS.IS_NOT_CUT_OPERATION,
};

export const pasteSpecialValueMenuItem: MenuItemSpec = {
  name: _lt("Paste value only"),
  action: ACTIONS.PASTE_VALUE_ACTION,
};

export const pasteSpecialFormatMenuItem: MenuItemSpec = {
  name: _lt("Paste format only"),
  action: ACTIONS.PASTE_FORMAT_ACTION,
};

export const findAndReplaceMenuItem: MenuItemSpec = {
  name: _lt("Find and replace"),
  description: "Ctrl+H",
  isReadonlyAllowed: true,
  action: ACTIONS.OPEN_FAR_SIDEPANEL_ACTION,
};

export const deleteValuesMenuItem: MenuItemSpec = {
  name: _lt("Delete values"),
  action: ACTIONS.DELETE_CONTENT_ACTION,
};

export const deleteRowsMenuItem: MenuItemSpec = {
  name: ACTIONS.REMOVE_ROWS_NAME,
  action: ACTIONS.REMOVE_ROWS_ACTION,
};

export const deleteRowMenuItem: MenuItemSpec = {
  ...deleteRowsMenuItem,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const clearRowsMenuItem: MenuItemSpec = {
  name: ACTIONS.DELETE_CONTENT_ROWS_NAME,
  action: ACTIONS.DELETE_CONTENT_ROWS_ACTION,
};

export const deleteColsMenuItem: MenuItemSpec = {
  name: ACTIONS.REMOVE_COLUMNS_NAME,
  action: ACTIONS.REMOVE_COLUMNS_ACTION,
};

export const deleteColMenuItem: MenuItemSpec = {
  ...deleteColsMenuItem,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const clearColsMenuItem: MenuItemSpec = {
  name: ACTIONS.DELETE_CONTENT_COLUMNS_NAME,
  action: ACTIONS.DELETE_CONTENT_COLUMNS_ACTION,
};

export const deleteCellsMenuItem: MenuItemSpec = {
  name: _lt("Delete cells"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const deleteCellShiftUpMenuItem: MenuItemSpec = {
  name: _lt("Delete cell and shift up"),
  action: ACTIONS.DELETE_CELL_SHIFT_UP,
};

export const deleteCellShiftLeftMenuItem: MenuItemSpec = {
  name: _lt("Delete cell and shift left"),
  action: ACTIONS.DELETE_CELL_SHIFT_LEFT,
};
