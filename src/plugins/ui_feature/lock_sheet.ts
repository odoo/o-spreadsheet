import { _t } from "../../translation";
import { Command, CommandResult, overrideLockCommands } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class LockSheetPlugin extends UIPlugin {
  static getters = ["isCurrentSheetLocked"] as const;

  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    if (overrideLockCommands.has(cmd.type)) {
      return CommandResult.Success;
    }
    if (
      ("sheetId" in cmd && this.getters.isSheetLocked(cmd.sheetId)) ||
      this.getters.isSheetLocked(this.getters.getActiveSheetId())
    ) {
      this.ui.raiseBlockingErrorUI(
        _t("This sheet is locked and cannot be modified. Please unlock it first.")
      );
      return CommandResult.SheetLocked;
    }
    return CommandResult.Success;
  }

  isCurrentSheetLocked() {
    return this.getters.isSheetLocked(this.getters.getActiveSheetId());
  }
}
