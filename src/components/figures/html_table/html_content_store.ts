import { SpreadsheetStore } from "../../../stores";
import { CellValueType, UID, Zone } from "../../../types";

// ADRM TODO: use ranges and remove title ?
export interface HTMLContentDescr {
  sheetId: UID;
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
        sheetId,
        contentZone: tableZone,
        title,
        // title: "",
        displayZone: title ? { ...tableZone, top: tableZone.top - 1 } : tableZone,
      };
    });
  }
}
