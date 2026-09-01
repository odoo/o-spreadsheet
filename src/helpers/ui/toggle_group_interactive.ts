import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { Dimension, HeaderIndex, UID } from "../../types/misc";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export const ToggleGroupInteractiveContent = {
  CannotHideAllRows: _t("Cannot hide all the rows of a sheet."),
  CannotHideAllColumns: _t("Cannot hide all the columns of a sheet."),
};

export function interactiveToggleGroup(
  env: SpreadsheetActionEnv,
  sheetId: UID,
  dimension: Dimension,
  start: HeaderIndex,
  end: HeaderIndex
) {
  const group = env.model.getters.getHeaderGroup(sheetId, dimension, start, end);
  if (!group) {
    return;
  }
  const command = group.isFolded ? "UNFOLD_HEADER_GROUP" : "FOLD_HEADER_GROUP";
  const result = env.model.dispatch(command, {
    sheetId,
    dimension,
    start: group.start,
    end: group.end,
  });
  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.NotEnoughElements)) {
      const errorMessage =
        dimension === "ROW"
          ? ToggleGroupInteractiveContent.CannotHideAllRows
          : ToggleGroupInteractiveContent.CannotHideAllColumns;
      env.getPlugin(NotificationPlugin).raiseError(errorMessage);
    }
  }
}
