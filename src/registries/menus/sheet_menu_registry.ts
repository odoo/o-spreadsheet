import * as ACTION_SHEET from "../../actions/sheet_actions";
import { MenuItemRegistry } from "../menu_items_registry";

export function getSheetMenuRegistry(args: {
  renameSheetCallback: () => void;
  openSheetColorPickerCallback: () => void;
}): MenuItemRegistry {
  const sheetMenuRegistry = new MenuItemRegistry();

  sheetMenuRegistry
    .add("delete", {
      ...ACTION_SHEET.deleteSheet,
      sequence: 10,
    })
    .add("hide_sheet", {
      ...ACTION_SHEET.hideSheet,
      sequence: 20,
    })
    .add("duplicate", {
      ...ACTION_SHEET.duplicateSheet,
      sequence: 30,
      separator: true,
    })
    .add("rename", {
      ...ACTION_SHEET.renameSheet(args),
      sequence: 40,
    })
    .add("change_color", {
      ...ACTION_SHEET.changeSheetColor(args),
      sequence: 50,
      separator: true,
    })
    .add("move_right", {
      ...ACTION_SHEET.sheetMoveRight,
      sequence: 60,
    })
    .add("move_left", {
      ...ACTION_SHEET.sheetMoveLeft,
      sequence: 70,
    });

  return sheetMenuRegistry;
}
