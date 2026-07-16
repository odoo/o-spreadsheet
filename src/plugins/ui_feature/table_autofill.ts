import { getTableContentZone } from "../../helpers/table_helpers";
import { isInside } from "../../helpers/zones";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { CellValueType } from "../../types/cells";
import { Command } from "../../types/commands";
import { CellPosition, Zone } from "../../types/misc";

export class TableAutofillStore extends SpreadsheetStore {
  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTOFILL_TABLE_COLUMN":
        const table = this.getters.getCoreTable(cmd);
        const cell = this.getters.getCell(cmd);
        if (!table?.config.automaticAutofill || table.type === "dynamic" || !cell?.isFormula) {
          return;
        }

        const { col, row } = cmd;
        const tableContentZone = getTableContentZone(table.range.zone, table.config);
        if (tableContentZone && isInside(col, row, tableContentZone)) {
          const top = cmd.autofillRowStart ?? tableContentZone.top;
          const bottom = cmd.autofillRowEnd ?? tableContentZone.bottom;
          const autofillZone = { ...tableContentZone, top, bottom };
          this.autofillTableZone(cmd, autofillZone);
        }
        break;
    }
  }

  private autofillTableZone(autofillSource: CellPosition, zone: Zone) {
    if (zone.top === zone.bottom) {
      return;
    }
    const { col, row, sheetId } = autofillSource;

    for (let r = zone.top; r <= zone.bottom; r++) {
      if (r === row) {
        continue;
      }
      if (this.getters.getEvaluatedCell({ col, row: r, sheetId }).type !== CellValueType.empty) {
        return;
      }
    }

    // TODO: seems odd that autofill a table column have side effects on the selection. Autofill commands should be
    // refactored to take the selection as a parameter
    const oldSelection = {
      zone: this.getters.getSelectedZone(),
      cell: this.getters.getActivePosition(),
    };

    this.model.selection.selectCell(col, row);
    this.model.dispatch("AUTOFILL_SELECT", { col, row: zone.bottom });
    this.model.dispatch("AUTOFILL");

    this.model.selection.selectCell(col, row);
    this.model.dispatch("AUTOFILL_SELECT", { col, row: zone.top });
    this.model.dispatch("AUTOFILL");

    this.model.selection.selectZone(oldSelection);
  }
}
