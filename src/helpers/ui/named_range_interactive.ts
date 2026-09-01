import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { _t } from "../../translation";
import {
  CommandResult,
  CreateNamedRangeCommand,
  DispatchResult,
  UpdateNamedRangeCommand,
} from "../../types/commands";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";

export function interactiveCreateNamedRange(
  env: SpreadsheetActionEnv,
  payload: Omit<CreateNamedRangeCommand, "type">
) {
  const result = env.model.dispatch("CREATE_NAMED_RANGE", payload);
  handleResult(env, result);
}

export function interactiveUpdateNamedRange(
  env: SpreadsheetActionEnv,
  payload: Omit<UpdateNamedRangeCommand, "type">
) {
  const result = env.model.dispatch("UPDATE_NAMED_RANGE", payload);
  handleResult(env, result);
}

function handleResult(env: SpreadsheetActionEnv, result: DispatchResult) {
  const notificationPlugin = env.getPlugin(NotificationPlugin);
  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.NamedRangeNameAlreadyExists)) {
      notificationPlugin.raiseError(_t("A named range with this name already exists."));
    } else if (result.isCancelledBecause(CommandResult.NamedRangeInvalidName)) {
      notificationPlugin.raiseError(
        _t(
          "The named range name is invalid. Valid names can contain letters, digits, underscores, and periods. The name cannot be only a number, TRUE, or FALSE."
        )
      );
    } else if (result.isCancelledBecause(CommandResult.NamedRangeNameLooksLikeCellReference)) {
      notificationPlugin.raiseError(_t("A named range name cannot resemble a cell reference."));
    } else if (result.isCancelledBecause(CommandResult.NamedRangeNotFound)) {
      notificationPlugin.raiseError(_t("The named range to update was not found."));
    }
  }
}
