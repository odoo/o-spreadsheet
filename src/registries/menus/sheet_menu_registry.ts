import { uuidv4 } from "../../helpers/index";
import { _lt } from "../../translation";
import { SpreadsheetEnv } from "../../types";
import { MenuItemRegistry } from "../menu_items_registry";

export const sheetMenuRegistry = new MenuItemRegistry();

function getDuplicateSheetName(env: SpreadsheetEnv, sheet: string) {
  let i = 1;
  const names = env.getters.getSheets().map((s) => s.name);
  const baseName = env._t(`Copy of ${sheet}`);
  let name = baseName;
  while (names.includes(name)) {
    name = `${baseName} (${i})`;
    i++;
  }
  return name;
}

sheetMenuRegistry
  .add("delete", {
    name: _lt("Delete"),
    sequence: 10,
    isVisible: (env) => {
      return env.getters.getSheets().length > 1;
    },
    action: (env) =>
      env.dispatch("DELETE_SHEET_CONFIRMATION", { sheetId: env.getters.getActiveSheetId() }),
  })
  .add("duplicate", {
    name: _lt("Duplicate"),
    sequence: 20,
    action: (env) => {
      const sheetIdFrom = env.getters.getActiveSheetId();
      const name = getDuplicateSheetName(
        env,
        env.getters.getSheets().find((s) => s.id === sheetIdFrom)!.name
      );
      const sheetIdTo = uuidv4();
      env.dispatch("DUPLICATE_SHEET", {
        sheetIdFrom,
        sheetIdTo,
        name,
      });
      env.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
    },
  })
  .add("rename", {
    name: _lt("Rename"),
    sequence: 30,
    action: (env) =>
      env.dispatch("RENAME_SHEET", {
        interactive: true,
        sheetId: env.getters.getActiveSheetId(),
      }),
  })
  .add("move_right", {
    name: _lt("Move right"),
    sequence: 40,
    isVisible: (env) => {
      const sheet = env.getters.getActiveSheetId();
      const sheets = env.getters.getSheets();
      return sheets.findIndex((s) => s.id === sheet) !== sheets.length - 1;
    },
    action: (env) =>
      env.dispatch("MOVE_SHEET", { sheetId: env.getters.getActiveSheetId(), direction: "right" }),
  })
  .add("move_left", {
    name: _lt("Move left"),
    sequence: 50,
    isVisible: (env) => {
      const sheet = env.getters.getActiveSheetId();
      return env.getters.getSheets().findIndex((s) => s.id === sheet) !== 0;
    },
    action: (env) =>
      env.dispatch("MOVE_SHEET", { sheetId: env.getters.getActiveSheetId(), direction: "left" }),
  });
