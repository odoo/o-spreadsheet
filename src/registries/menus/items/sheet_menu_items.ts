import { buildSheetLink, markdownLink } from "../../../helpers";
import { _lt } from "../../../translation";
import { MenuItemSpec } from "../../menu_items_registry";

export const linkSheetMenuItem: MenuItemSpec = {
  name: _lt("Link sheet"),
  children: [
    (env) => {
      const sheets = env.model.getters
        .getSheetIds()
        .map((sheetId) => env.model.getters.getSheet(sheetId));
      return sheets.map((sheet) => ({
        id: sheet.id,
        name: sheet.name,
        action: () => markdownLink(sheet.name, buildSheetLink(sheet.id)),
      }));
    },
  ],
};

export const deleteSheetMenuItem: MenuItemSpec = {
  name: _lt("Delete"),
  isVisible: (env) => {
    return env.model.getters.getSheetIds().length > 1;
  },
  action: (env) =>
    env.askConfirmation(_lt("Are you sure you want to delete this sheet ?"), () => {
      env.model.dispatch("DELETE_SHEET", { sheetId: env.model.getters.getActiveSheetId() });
    }),
};

export const duplicateSheetMenuItem: MenuItemSpec = {
  name: _lt("Duplicate"),
  action: (env) => {
    const sheetIdFrom = env.model.getters.getActiveSheetId();
    const sheetIdTo = env.model.uuidGenerator.uuidv4();
    env.model.dispatch("DUPLICATE_SHEET", {
      sheetId: sheetIdFrom,
      sheetIdTo,
    });
    env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
  },
};

export const renameSheetMenuItem = (args: { renameSheetCallback: () => void }): MenuItemSpec => {
  return {
    name: _lt("Rename"),
    action: args.renameSheetCallback,
  };
};

export const sheetMoveRightMenuItem: MenuItemSpec = {
  name: _lt("Move right"),
  isVisible: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const sheetIds = env.model.getters.getVisibleSheetIds();
    return sheetIds.indexOf(sheetId) !== sheetIds.length - 1;
  },
  action: (env) =>
    env.model.dispatch("MOVE_SHEET", {
      sheetId: env.model.getters.getActiveSheetId(),
      delta: 1,
    }),
};

export const sheetMoveLeftMenuItem: MenuItemSpec = {
  name: _lt("Move left"),
  isVisible: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    return env.model.getters.getVisibleSheetIds()[0] !== sheetId;
  },
  action: (env) =>
    env.model.dispatch("MOVE_SHEET", {
      sheetId: env.model.getters.getActiveSheetId(),
      delta: -1,
    }),
};

export const hideSheetMenuItem: MenuItemSpec = {
  name: _lt("Hide sheet"),
  isVisible: (env) => env.model.getters.getVisibleSheetIds().length !== 1,
  action: (env) =>
    env.model.dispatch("HIDE_SHEET", { sheetId: env.model.getters.getActiveSheetId() }),
};
