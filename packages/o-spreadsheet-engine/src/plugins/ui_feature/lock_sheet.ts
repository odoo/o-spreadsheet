import {
  Command,
  CommandResult,
  isCoreCommand,
  lockedSheetAllowedCommands,
} from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class LockSheetPlugin extends UIPlugin {
  static getters = ["isCurrentSheetLocked"] as const;

  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    /**
     * isDashboard() implies that the user is not connected
     * to other users and can do any operation and can do core modifications that will only affect them
     * It is acceptable to bypass the locked sheet restriction in this case
     */
    if (lockedSheetAllowedCommands.has(cmd.type) || this.getters.isDashboard()) {
      return CommandResult.Success;
    }
    if (
      ("sheetId" in cmd && this.getters.isSheetLocked(cmd.sheetId)) ||
      (!isCoreCommand(cmd) && this.isCurrentSheetLocked())
    ) {
      // this.ui.notifyUI({
      //   type: "info",
      //   text: _t("This sheet is locked and cannot be modified. Please unlock it first."),
      //   sticky: false,
      // });
      return CommandResult.SheetLocked;
    }
    return CommandResult.Success;
  }

  isCurrentSheetLocked() {
    return this.getters.isSheetLocked(this.getters.getActiveSheetId());
  }
}
