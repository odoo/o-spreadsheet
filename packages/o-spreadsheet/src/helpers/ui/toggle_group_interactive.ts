import { _t } from "../../translation";
import { CommandResult, Dimension, HeaderIndex, SpreadsheetChildEnv, UID } from "../../types";

export const ToggleGroupInteractiveContent = {
  CannotHideAllRows: _t("Cannot hide all the rows of a sheet."),
  CannotHideAllColumns: _t("Cannot hide all the columns of a sheet."),
};

export function interactiveToggleGroup(
  env: SpreadsheetChildEnv,
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
      env.raiseError(errorMessage);
    }
  }
}
