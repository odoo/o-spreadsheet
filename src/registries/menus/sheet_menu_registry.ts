import { interactiveRenameSheet } from "../../helpers/ui/sheet_interactive";
import { _lt } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

export const sheetMenuRegistry = new MenuItemRegistry();

sheetMenuRegistry
  .add("delete", {
    name: _lt("Delete"),
    sequence: 10,
    isVisible: (env) => {
      return env.model.getters.getVisibleSheetIds().length > 1;
    },
    action: (env) =>
      env.askConfirmation(_lt("Are you sure you want to delete this sheet ?"), () => {
        env.model.dispatch("DELETE_SHEET", { sheetId: env.model.getters.getActiveSheetId() });
      }),
  })
  .add("duplicate", {
    name: _lt("Duplicate"),
    sequence: 20,
    action: (env) => {
      const sheetIdFrom = env.model.getters.getActiveSheetId();
      const sheetIdTo = env.model.uuidGenerator.smallUuid();
      env.model.dispatch("DUPLICATE_SHEET", {
        sheetId: sheetIdFrom,
        sheetIdTo,
      });
      env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
    },
  })
  .add("rename", {
    name: _lt("Rename"),
    sequence: 30,
    action: (env) => interactiveRenameSheet(env, env.model.getters.getActiveSheetId()),
  })
  .add("move_right", {
    name: _lt("Move right"),
    sequence: 40,
    isVisible: (env) => {
      const sheetId = env.model.getters.getActiveSheetId();
      const sheetIds = env.model.getters.getVisibleSheetIds();
      return sheetIds.indexOf(sheetId) !== sheetIds.length - 1;
    },
    action: (env) =>
      env.model.dispatch("MOVE_SHEET", {
        sheetId: env.model.getters.getActiveSheetId(),
        direction: "right",
      }),
  })
  .add("move_left", {
    name: _lt("Move left"),
    sequence: 50,
    isVisible: (env) => {
      const sheetId = env.model.getters.getActiveSheetId();
      return env.model.getters.getVisibleSheetIds()[0] !== sheetId;
    },
    action: (env) =>
      env.model.dispatch("MOVE_SHEET", {
        sheetId: env.model.getters.getActiveSheetId(),
        direction: "left",
      }),
  })
  .add("hide_sheet", {
    name: _lt("Hide sheet"),
    sequence: 60,
    isVisible: (env) => env.model.getters.getVisibleSheetIds().length !== 1,
    action: (env) =>
      env.model.dispatch("HIDE_SHEET", { sheetId: env.model.getters.getActiveSheetId() }),
  });
