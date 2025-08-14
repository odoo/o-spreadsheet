import { MergeErrorMessage } from "../../components/translations_terms";
import { CommandResult, Dimension, HeaderIndex, SpreadsheetChildEnv } from "../../types";

export function interactiveFreezeColumnsRows(
  env: SpreadsheetChildEnv,
  dimension: Dimension,
  base: HeaderIndex
) {
  const sheetId = env.model.getters.getActiveSheetId();
  const cmd = dimension === "COL" ? "FREEZE_COLUMNS" : "FREEZE_ROWS";
  const result = env.model.dispatch(cmd, { sheetId, quantity: base });

  if (result.isCancelledBecause(CommandResult.MergeOverlap)) {
    env.raiseError(MergeErrorMessage);
  }
}
