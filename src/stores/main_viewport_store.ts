import { Command } from "../types/commands";
import { UID } from "../types/misc";
import { SpreadsheetStore } from "./spreadsheet_store";
import { ViewportsStore } from "./viewports_store";

/**
 * The goal of this store is to make its attached viewport store follow the active sheet
 */
export class MainViewportStore extends SpreadsheetStore {
  private viewStore = this.get(ViewportsStore);

  private sheetIdAtFinalize: UID | undefined = undefined;

  protected handle(cmd: Command): void {
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
      case "DELETE_SHEET":
        if (!this.getters.tryGetSheet(this.viewStore.displayedSheetId)) {
          this.sheetIdAtFinalize = this.model.getters.getActiveSheetId();
        }
        break;
      case "ACTIVATE_SHEET":
        this.viewStore.setDisplayedSheetId(cmd.sheetIdTo);
        break;
    }
  }

  protected finalize(): void {
    if (this.sheetIdAtFinalize) {
      this.viewStore.setDisplayedSheetId(this.sheetIdAtFinalize);
      this.sheetIdAtFinalize = undefined;
    }
  }
}
