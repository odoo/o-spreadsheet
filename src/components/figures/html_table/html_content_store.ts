import { SpreadsheetStore } from "../../../stores";
import { CellValueType, Zone } from "../../../types";

export interface HTMLContentDescr {
  contentZone: Zone;
  displayZone: Zone;
  title: string | undefined;
}

export class HTMLContentStore extends SpreadsheetStore {
  get htmlContentTables(): HTMLContentDescr[] {
    const sheetId = this.getters.getActiveSheetId();
    if (this.getters.getEvaluatedCell({ sheetId, col: 0, row: 0 }).formattedValue) {
      return [];
    }
    return this.getters.getTables(sheetId).map((table) => {
      const tableZone = table.range.zone;
      const titleCell = this.getters.getEvaluatedCell({
        sheetId,
        col: tableZone.left,
        row: tableZone.top - 1,
      });
      const title =
        titleCell.type === CellValueType.text && titleCell.formattedValue
          ? titleCell.formattedValue
          : undefined;
      return {
        contentZone: tableZone,
        title,
        // title: "",
        displayZone: title ? { ...tableZone, top: tableZone.top - 1 } : tableZone,
      };
    });
  }
}
