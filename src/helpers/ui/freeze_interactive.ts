import { MergeErrorMessage } from "../../components/translations_terms";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { CommandResult } from "../../types/commands";
import { Dimension, HeaderIndex } from "../../types/misc";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export function interactiveFreezeColumnsRows(
  env: SpreadsheetActionEnv,
  dimension: Dimension,
  base: HeaderIndex
) {
  const sheetId = env.model.getters.getActiveSheetId();
  const cmd = dimension === "COL" ? "FREEZE_COLUMNS" : "FREEZE_ROWS";
  const result = env.model.dispatch(cmd, { sheetId, quantity: base });

  if (result.isCancelledBecause(CommandResult.MergeOverlap)) {
    env.getPlugin(NotificationPlugin).raiseError(MergeErrorMessage);
  }
}
