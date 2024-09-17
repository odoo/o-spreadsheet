import { buildSheetLink, markdownLink } from "../helpers";
import { _t } from "../translation";
import { ActionSpec } from "./action";

export const linkSheet: ActionSpec = {
  name: _t("Link sheet"),
  children: [
    (env) => {
      const sheets = env.model.getters
        .getSheetIds()
        .map((sheetId) => env.model.getters.getSheet(sheetId));
      return sheets.map((sheet) => ({
        id: sheet.id,
        name: sheet.name,
        execute: () => markdownLink(sheet.name, buildSheetLink(sheet.id)),
      }));
    },
  ],
};

export const deleteSheet: ActionSpec = {
  name: _t("Delete"),
  isVisible: (env) => {
    return env.model.getters.getSheetIds().length > 1;
  },
  execute: (env) =>
    env.askConfirmation(_t("Are you sure you want to delete this sheet?"), () => {
      env.model.dispatch("DELETE_SHEET", { sheetId: env.model.getters.getActiveSheetId() });
    }),
  icon: "o-spreadsheet-Icon.TRASH",
};

export const duplicateSheet: ActionSpec = {
  name: _t("Duplicate"),
  execute: (env) => {
    const sheetIdFrom = env.model.getters.getActiveSheetId();
    const sheetIdTo = env.model.uuidGenerator.uuidv4();
    env.model.dispatch("DUPLICATE_SHEET", {
      sheetId: sheetIdFrom,
      sheetIdTo,
    });
    env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
  },
  icon: "o-spreadsheet-Icon.COPY",
};

export const renameSheet = (args: { renameSheetCallback: () => void }): ActionSpec => {
  return {
    name: _t("Rename"),
    execute: args.renameSheetCallback,
    icon: "o-spreadsheet-Icon.RENAME_SHEET",
  };
};

export const changeSheetColor = (args: {
  openSheetColorPickerCallback: () => void;
}): ActionSpec => {
  return {
    name: _t("Change color"),
    execute: args.openSheetColorPickerCallback,
    icon: "o-spreadsheet-Icon.PAINT_FORMAT",
  };
};

export const sheetMoveRight: ActionSpec = {
  name: _t("Move right"),
  isVisible: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    const sheetIds = env.model.getters.getVisibleSheetIds();
    return sheetIds.indexOf(sheetId) !== sheetIds.length - 1;
  },
  execute: (env) =>
    env.model.dispatch("MOVE_SHEET", {
      sheetId: env.model.getters.getActiveSheetId(),
      delta: 1,
    }),
  icon: "o-spreadsheet-Icon.MOVE_SHEET_RIGHT",
};

export const sheetMoveLeft: ActionSpec = {
  name: _t("Move left"),
  isVisible: (env) => {
    const sheetId = env.model.getters.getActiveSheetId();
    return env.model.getters.getVisibleSheetIds()[0] !== sheetId;
  },
  execute: (env) =>
    env.model.dispatch("MOVE_SHEET", {
      sheetId: env.model.getters.getActiveSheetId(),
      delta: -1,
    }),
  icon: "o-spreadsheet-Icon.MOVE_SHEET_LEFT",
};

export const hideSheet: ActionSpec = {
  name: _t("Hide sheet"),
  isVisible: (env) => env.model.getters.getVisibleSheetIds().length !== 1,
  execute: (env) =>
    env.model.dispatch("HIDE_SHEET", { sheetId: env.model.getters.getActiveSheetId() }),
  icon: "o-spreadsheet-Icon.HIDE_SHEET",
};
