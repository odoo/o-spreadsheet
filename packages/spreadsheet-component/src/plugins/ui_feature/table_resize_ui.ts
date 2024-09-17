import { Command, CommandResult } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class TableResizeUI extends UIPlugin {
  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "RESIZE_TABLE":
        const table = this.getters.getCoreTableMatchingTopLeft(cmd.sheetId, cmd.zone);
        if (!table) {
          return CommandResult.TableNotFound;
        }

        const oldTableZone = table.range.zone;
        const newTableZone = this.getters.getRangeFromRangeData(cmd.newTableRange).zone;
        if (newTableZone.top !== oldTableZone.top || newTableZone.left !== oldTableZone.left) {
          return CommandResult.InvalidTableResize;
        }
        return this.canDispatch("UPDATE_TABLE", { ...cmd }).reasons;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "RESIZE_TABLE": {
        const table = this.getters.getCoreTableMatchingTopLeft(cmd.sheetId, cmd.zone);
        this.dispatch("UPDATE_TABLE", { ...cmd });

        if (!table || !table.config.automaticAutofill) return;

        const oldTableZone = table.range.zone;
        const newTableZone = this.getters.getRangeFromRangeData(cmd.newTableRange).zone;

        if (newTableZone.bottom >= oldTableZone.bottom) {
          for (let col = newTableZone.left; col <= newTableZone.right; col++) {
            const autofillSource = { col, row: oldTableZone.bottom, sheetId: cmd.sheetId };
            if (this.getters.getCell(autofillSource)?.content.startsWith("=")) {
              this.dispatch("AUTOFILL_TABLE_COLUMN", {
                ...autofillSource,
                autofillRowStart: oldTableZone.bottom,
                autofillRowEnd: newTableZone.bottom,
              });
            }
          }
          break;
        }
      }
    }
  }
}
