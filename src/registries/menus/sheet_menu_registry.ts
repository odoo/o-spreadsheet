import { MenuItemRegistry } from "../menu_items_registry";
import * as ACTION_SHEET from "./items/sheet_menu_items";

export function getSheetMenuRegistry(args: { renameSheetCallback: () => void }): MenuItemRegistry {
  const sheetMenuRegistry = new MenuItemRegistry();

  sheetMenuRegistry
    .add("delete", {
      ...ACTION_SHEET.deleteSheetMenuItem,
      sequence: 10,
    })
    .add("duplicate", {
      ...ACTION_SHEET.duplicateSheetMenuItem,
      sequence: 20,
    })
    .add("rename", {
      ...ACTION_SHEET.renameSheetMenuItem(args),
      sequence: 30,
    })
    .add("move_right", {
      ...ACTION_SHEET.sheetMoveRightMenuItem,
      sequence: 40,
    })
    .add("move_left", {
      ...ACTION_SHEET.sheetMoveLeftMenuItem,
      sequence: 50,
    })
    .add("hide_sheet", {
      ...ACTION_SHEET.hideSheetMenuItem,
      sequence: 60,
    });

  return sheetMenuRegistry;
}
