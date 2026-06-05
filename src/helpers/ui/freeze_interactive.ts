import { Model } from "../..";
import { MergeErrorMessage } from "../../components/translations_terms";
import { CommandResult } from "../../types/commands";
import { Dimension, HeaderIndex } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function interactiveFreezeColumnsRows(
  model: Model,
  env: SpreadsheetChildEnv,
  dimension: Dimension,
  base: HeaderIndex
) {
  const sheetId = model.getters.getActiveSheetId();
  const cmd = dimension === "COL" ? "FREEZE_COLUMNS" : "FREEZE_ROWS";
  const result = model.dispatch(cmd, { sheetId, quantity: base });

  if (result.isCancelledBecause(CommandResult.MergeOverlap)) {
    env.raiseError(MergeErrorMessage);
  }
}
