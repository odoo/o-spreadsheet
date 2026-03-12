import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { DispatchResult } from "@odoo/o-spreadsheet-engine/types/commands";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { CommandResult } from "../../types";

export const SplitToColumnsInteractiveContent = {
  SplitIsDestructive: _t("This will overwrite data in the subsequent columns. Split anyway?"),
};

export async function interactiveSplitToColumns(
  env: SpreadsheetChildEnv,
  separator: string,
  addNewColumns: boolean
): Promise<DispatchResult> {
  const result = await env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", { separator, addNewColumns });
  if (result.isCancelledBecause(CommandResult.SplitWillOverwriteContent)) {
    env.askConfirmation(SplitToColumnsInteractiveContent.SplitIsDestructive, () => {
      env.model.dispatch("SPLIT_TEXT_INTO_COLUMNS", {
        separator,
        addNewColumns,
        force: true,
      });
    });
  }
  return result;
}
