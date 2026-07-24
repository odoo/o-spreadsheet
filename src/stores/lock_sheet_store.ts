import {
  Command,
  CommandResult,
  isCoreCommand,
  lockedSheetAllowedCommands,
} from "../types/commands";
import { Get } from "../types/store_engine";
import { SpreadsheetStore } from "./spreadsheet_store";

export class LockSheetStore extends SpreadsheetStore {
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
      (!isCoreCommand(cmd) && this.isCurrentSheetLocked)
    ) {
      return CommandResult.SheetLocked;
    }
    return CommandResult.Success;
  }

  get isCurrentSheetLocked() {
    return this.getters.isSheetLocked(this.getters.getActiveSheetId());
  }

  constructor(get: Get) {
    super(get);
    this.model.registerExternalAllowDispatch(this);
    this.onDispose(() => {
      this.model.unregisterExternalAllowDispatch(this);
    });
  }
}
