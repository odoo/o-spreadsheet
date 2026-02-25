import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import {
  CommandResult,
  CreateNamedRangeCommand,
  DispatchResult,
  UpdateNamedRangeCommand,
} from "../../types";

export function interactiveCreateNamedRange(
  env: SpreadsheetChildEnv,
  payload: Omit<CreateNamedRangeCommand, "type">
) {
  const result = env.model.dispatch("CREATE_NAMED_RANGE", payload);
  handleResult(env, result);
}

export function interactiveUpdateNamedRange(
  env: SpreadsheetChildEnv,
  payload: Omit<UpdateNamedRangeCommand, "type">
) {
  const result = env.model.dispatch("UPDATE_NAMED_RANGE", payload);
  handleResult(env, result);
}

function handleResult(env: SpreadsheetChildEnv, result: DispatchResult) {
  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.NamedRangeNameAlreadyExists)) {
      env.raiseError(_t("A named range with this name already exists."));
    } else if (result.isCancelledBecause(CommandResult.NamedRangeNameWithInvalidCharacter)) {
      env.raiseError(
        _t(
          "The named range name contains invalid characters. Valid characters are letters, numbers, underscores, and periods."
        )
      );
    } else if (result.isCancelledBecause(CommandResult.NamedRangeNameLooksLikeCellReference)) {
      env.raiseError(_t("A named range name cannot resemble a cell reference."));
    } else if (result.isCancelledBecause(CommandResult.NamedRangeNotFound)) {
      env.raiseError(_t("The named range to update was not found."));
    }
  }
}
