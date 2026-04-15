import { SpreadsheetStore } from "../../../stores";

export class HTMLContentStore extends SpreadsheetStore {
  get htmlContentTables() {
    const sheetId = this.getters.getActiveSheetId();
    if (this.getters.getEvaluatedCell({ sheetId, col: 0, row: 0 }).formattedValue) {
      return [];
    }
    const tables = this.getters.getTables(sheetId);
    return tables.map((table) => table.range.zone);
  }
}
