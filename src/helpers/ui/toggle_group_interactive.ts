import { Model } from "../../model";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { Dimension, HeaderIndex, UID } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export const ToggleGroupInteractiveContent = {
  CannotHideAllRows: _t("Cannot hide all the rows of a sheet."),
  CannotHideAllColumns: _t("Cannot hide all the columns of a sheet."),
};

export function interactiveToggleGroup(
  model: Model,
  env: SpreadsheetChildEnv,
  sheetId: UID,
  dimension: Dimension,
  start: HeaderIndex,
  end: HeaderIndex
) {
  const group = model.getters.getHeaderGroup(sheetId, dimension, start, end);
  if (!group) {
    return;
  }
  const command = group.isFolded ? "UNFOLD_HEADER_GROUP" : "FOLD_HEADER_GROUP";
  const result = model.dispatch(command, {
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
      env.raiseError(errorMessage);
    }
  }
}
