import { Mode } from "../../model";
import { Command, isCoreCommand, UID } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

export class SelectionHistoryPlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
  private undoStack: UID[] = [];
  private redoStack: UID[] = [];
  private activeSheetId: UID | undefined = undefined;
  private isStarted = false;
  private isHandlingLocalCoreCommand = false;

  beforeHandle(cmd: Command) {
    if (!this.isStarted || this.activeSheetId) return;
    this.activeSheetId = this.getters.getActiveSheetId();
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.isStarted = true;
        break;
      case "UNDO": {
        if (!cmd.isLocal) return;
        const sheetId = this.undoStack.pop();
        if (!sheetId) break;
        this.activate(sheetId);
        this.redoStack.push(sheetId);
        break;
      }
      case "REDO":
        if (!cmd.isLocal) return;
        const sheetId = this.redoStack.pop();
        if (!sheetId) break;
        this.activate(sheetId);
        this.undoStack.push(sheetId);
        break;
    }
    if (cmd.isPrimaryDispatch && isCoreCommand(cmd)) {
      this.isHandlingLocalCoreCommand = true;
    }
  }

  finalize() {
    if (this.isHandlingLocalCoreCommand && this.activeSheetId) {
      this.undoStack.push(this.activeSheetId);
    }
    this.activeSheetId = undefined;
    this.isHandlingLocalCoreCommand = false;
  }

  private activate(sheetId: UID) {
    if (!this.getters.tryGetSheet(sheetId) || this.getters.getActiveSheetId() === sheetId) return;
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.getters.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
  }
}
