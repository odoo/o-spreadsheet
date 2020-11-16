import { CancelledReason, Command, CommandResult, Sheet, UID } from "../../types";
import { UIPlugin } from "../ui_plugin";

interface UIState {
  activeSheet: Sheet;
}

export class SheetUIPlugin extends UIPlugin<UIState> {
  static getters = ["getActiveSheet", "getActiveSheetId"];
  activeSheet: Sheet = this.getters.getSheets()[0];

  // This flag is used to avoid to historize the ACTIVE_SHEET command when it's
  // the main command.
  private historizeActiveSheet: boolean = true;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        try {
          this.getters.getSheet(cmd.sheetIdTo);
          this.historizeActiveSheet = false;
          break;
        } catch (error) {
          return { status: "CANCELLED", reason: CancelledReason.InvalidSheetId };
        }
        break;
    }
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        if (cmd.activate) {
          this.dispatch("ACTIVATE_SHEET", {
            sheetIdFrom: this.getActiveSheetId(),
            sheetIdTo: cmd.sheetId,
          });
        }
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetIdTo);
        break;
      case "START":
        this.historizeActiveSheet = false;
        this.dispatch("ACTIVATE_SHEET", {
          sheetIdTo: this.getters.getSheets()[0].id,
          sheetIdFrom: this.getters.getSheets()[0].id,
        });
        break;
      case "ACTIVATE_SHEET":
        const sheet = this.getters.getSheet(cmd.sheetIdTo);
        if (this.historizeActiveSheet) {
          this.history.update("activeSheet", sheet);
        } else {
          this.activeSheet = sheet;
        }
        break;
    }
  }

  duplicateSheet(sheetId: UID) {
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
  }

  finalize() {
    this.historizeActiveSheet = true;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getActiveSheet(): Sheet {
    return this.activeSheet;
  }

  getActiveSheetId(): UID {
    return this.activeSheet.id;
  }
}
