import * as ACTION_SHEET from "../../actions/sheet_actions";
import { MenuItemRegistry } from "../menu_items_registry";

export function getSheetMenuRegistry(args: { renameSheetCallback: () => void }): MenuItemRegistry {
  const sheetMenuRegistry = new MenuItemRegistry();

  sheetMenuRegistry
    .add("delete", {
      ...ACTION_SHEET.deleteSheet,
      sequence: 10,
    })
    .add("duplicate", {
      ...ACTION_SHEET.duplicateSheet,
      sequence: 20,
    })
    .add("rename", {
      ...ACTION_SHEET.renameSheet(args),
      sequence: 30,
    })
    .add("move_right", {
      ...ACTION_SHEET.sheetMoveRight,
      sequence: 40,
    })
    .add("move_left", {
      ...ACTION_SHEET.sheetMoveLeft,
      sequence: 50,
    })
    .add("hide_sheet", {
      ...ACTION_SHEET.hideSheet,
      sequence: 60,
    });

  return sheetMenuRegistry;
}
