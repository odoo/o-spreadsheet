import { MenuItemRegistry } from "../menu_items_registry";
import { _lt } from "../../translation";

export const sheetMenuRegistry = new MenuItemRegistry();

sheetMenuRegistry
  .add("delete", {
    name: _lt("Delete"),
    sequence: 10,
    isEnabled: (env) => {
      return env.getters.getSheets().length > 1;
    },
    action: (env) => env.dispatch("DELETE_SHEET", { sheet: env.getters.getActiveSheet() }),
  })
  // .add("duplicate", {
  //   name: _lt("Duplicate"),
  //   sequence: 20,
  //   action: () => console.warn("Not implemented"),
  // })
  // .add("rename", {
  //   name: _lt("Rename"),
  //   sequence: 30,
  //   action: () => console.warn("Not implemented"),
  // })
  .add("move_right", {
    name: _lt("Move right"),
    sequence: 40,
    isEnabled: (env) => {
      const sheet = env.getters.getActiveSheet();
      const sheets = env.getters.getSheets();
      return sheets.findIndex((s) => s.id === sheet) !== sheets.length - 1;
    },
    action: (env) =>
      env.dispatch("MOVE_SHEET", { sheet: env.getters.getActiveSheet(), left: false }),
  })
  .add("move_left", {
    name: _lt("Move left"),
    sequence: 50,
    isEnabled: (env) => {
      const sheet = env.getters.getActiveSheet();
      return env.getters.getSheets().findIndex((s) => s.id === sheet) !== 0;
    },
    action: (env) =>
      env.dispatch("MOVE_SHEET", { sheet: env.getters.getActiveSheet(), left: true }),
  });
