import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { Command, CommandResult, DispatchResult, ResizeTableCommand } from "../../types/commands";

export class TableResizeStore extends SpreadsheetStore {
  canResizeTable(cmd: ResizeTableCommand): DispatchResult {
    const table = this.getters.getCoreTableMatchingTopLeft(cmd.sheetId, cmd.zone);
    if (!table) {
      return new DispatchResult([CommandResult.TableNotFound]);
    }

    const oldTableZone = table.range.zone;
    const newTableZone = this.getters.getRangeFromRangeData(cmd.newTableRange).zone;
    if (newTableZone.top !== oldTableZone.top || newTableZone.left !== oldTableZone.left) {
      return new DispatchResult([CommandResult.InvalidTableResize]);
    }
    return this.model.canDispatch("UPDATE_TABLE", { ...cmd });
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "RESIZE_TABLE": {
        if (!this.canResizeTable(cmd).isSuccessful) {
          return;
        }
        const table = this.getters.getCoreTableMatchingTopLeft(cmd.sheetId, cmd.zone);
        this.model.dispatch("UPDATE_TABLE", { ...cmd });

        if (!table) {
          return;
        }
        const newTableZone = this.getters.getRangeFromRangeData(cmd.newTableRange).zone;
        this.model.selection.selectCell(newTableZone.right, newTableZone.bottom);
        if (!table.config.automaticAutofill) {
          return;
        }
        const oldTableZone = table.range.zone;

        if (newTableZone.bottom >= oldTableZone.bottom) {
          for (let col = newTableZone.left; col <= newTableZone.right; col++) {
            const autofillSource = { col, row: oldTableZone.bottom, sheetId: cmd.sheetId };
            if (this.getters.getCell(autofillSource)?.isFormula) {
              this.model.dispatch("AUTOFILL_TABLE_COLUMN", {
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
