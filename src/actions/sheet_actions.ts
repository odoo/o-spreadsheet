import { buildSheetLink, markdownLink } from "../helpers/misc";
import { UuidGenerator } from "../helpers/uuid";
import { _t } from "../translation";
import { ActionSpec } from "./action";

export const linkSheet: ActionSpec = {
  name: _t("Link sheet"),
  children: [
    (model) => {
      const sheets = model.getters.getSheetIds().map((sheetId) => model.getters.getSheet(sheetId));
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
  isVisible: (model) => {
    return model.getters.getVisibleSheetIds().length > 1;
  },

  execute: (model, env) =>
    env.askConfirmation(_t("Are you sure you want to delete this sheet?"), () => {
      model.dispatch("DELETE_SHEET", {
        sheetId: model.getters.getActiveSheetId(),
        sheetName: model.getters.getActiveSheetName(),
      });
    }),
  icon: "o-spreadsheet-Icon.TRASH",
};

export const duplicateSheet: ActionSpec = {
  name: _t("Duplicate"),
  execute: (model, env) => {
    const sheetIdFrom = model.getters.getActiveSheetId();
    const sheetNameFrom = model.getters.getSheetName(sheetIdFrom);
    const sheetIdTo = UuidGenerator.smallUuid();
    const sheetNameTo = model.getters.getDuplicateSheetName(sheetNameFrom);
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: sheetIdFrom,
      sheetIdTo,
      sheetNameTo,
    });
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
  },
  isEnabledOnLockedSheet: true,
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
  isVisible: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    const sheetIds = model.getters.getVisibleSheetIds();
    return sheetIds.indexOf(sheetId) !== sheetIds.length - 1;
  },
  execute: (model) =>
    model.dispatch("MOVE_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
      delta: 1,
    }),
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.MOVE_SHEET_RIGHT",
};

export const sheetMoveLeft: ActionSpec = {
  name: _t("Move left"),
  isVisible: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    return model.getters.getVisibleSheetIds()[0] !== sheetId;
  },
  execute: (model) =>
    model.dispatch("MOVE_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
      delta: -1,
    }),
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.MOVE_SHEET_LEFT",
};

export const hideSheet: ActionSpec = {
  name: _t("Hide sheet"),
  isVisible: (model) => model.getters.getVisibleSheetIds().length !== 1,
  execute: (model) => model.dispatch("HIDE_SHEET", { sheetId: model.getters.getActiveSheetId() }),
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.HIDE_SHEET",
};

export const lockSheet: ActionSpec = {
  name: _t("Lock sheet"),
  isVisible: (model) => {
    return !model.getters.isCurrentSheetLocked();
  },
  execute: (model) => {
    model.dispatch("LOCK_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
    });
  },
  icon: "o-spreadsheet-Icon.LOCK",
};

export const unlockSheet: ActionSpec = {
  name: _t("Unlock sheet"),
  isVisible: (model) => {
    return model.getters.isCurrentSheetLocked();
  },
  execute: (model) => {
    model.dispatch("UNLOCK_SHEET", {
      sheetId: model.getters.getActiveSheetId(),
    });
  },
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.UNLOCK",
};
