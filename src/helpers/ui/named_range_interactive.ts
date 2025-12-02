import { debounce } from "@odoo/o-spreadsheet-engine";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import {
  CommandResult,
  CreateNamedRangeCommand,
  DispatchResult,
  UpdateNamedRangeCommand,
} from "../../types";

export const interactiveAddNamedRange = debounce(_interactiveAddNamedRange, 50);

export function _interactiveAddNamedRange(
  env: SpreadsheetChildEnv,
  payload: Omit<CreateNamedRangeCommand, "type">
) {
  const result = env.model.dispatch("CREATE_NAMED_RANGE", payload);
  handleResult(env, result);
}

export const interactiveUpdateNamedRange = debounce(_interactiveUpdateNamedRange, 50);

export function _interactiveUpdateNamedRange(
  env: SpreadsheetChildEnv,
  payload: Omit<UpdateNamedRangeCommand, "type">
) {
  // ADRM TODO: debounce ?
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
      env.raiseError(_t("The named range name cannot look like a cell reference."));
    } else if (result.isCancelledBecause(CommandResult.NamedRangeNotFound)) {
      env.raiseError(_t("The named range to update was not found."));
    }
  }
}
