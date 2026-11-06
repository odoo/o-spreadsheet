import { defaultDict, range } from "../../helpers/misc";
import { CellPosition, Dimension, HeaderIndex, UID } from "../../types/misc";
import { ExcelWorkbookData } from "../../types/workbook_data";
import { EvaluationPlugin } from "../evaluation_plugin";

export class HeaderVisibilityEvaluationPlugin extends EvaluationPlugin {
  private hiddenCache = defaultDict({ COL: {}, ROW: {} });

  static getters = [
    "getNextVisibleCellPosition",
    "findVisibleHeader",
    "findLastVisibleColRowIndex",
    "findFirstVisibleColRowIndex",
    "isRowHidden",
    "isColHidden",
    "isHeaderHidden",
  ] as const;

  handlers = {
    "*allCommands": this.resetCache,
  };

  resetCache() {
    this.hiddenCache = defaultDict({ COL: {}, ROW: {} });
  }

  isRowHidden(sheetId: UID, index: number): boolean {
    if (this.hiddenCache.get(sheetId)["ROW"]?.[index] !== undefined) {
      return this.hiddenCache.get(sheetId)["ROW"]?.[index];
    }
    const isHidden =
      this.getters.isRowHiddenOrFoldedByUser(sheetId, index) ||
      this.getters.isRowFiltered(sheetId, index);
    this.hiddenCache.get(sheetId)["ROW"][index] = isHidden;
    return isHidden;
  }

  isColHidden(sheetId: UID, index: number): boolean {
    if (this.hiddenCache.get(sheetId)["COL"]?.[index] !== undefined) {
      return this.hiddenCache.get(sheetId)["COL"]?.[index];
    }
    const isHidden = this.getters.isColHiddenOrFoldedByUser(sheetId, index);
    this.hiddenCache.get(sheetId)["COL"][index] = isHidden;
    return isHidden;
  }

  isHeaderHidden(sheetId: UID, dimension: Dimension, index: number) {
    return dimension === "COL"
      ? this.isColHidden(sheetId, index)
      : this.isRowHidden(sheetId, index);
  }

  getNextVisibleCellPosition({ sheetId, col, row }: CellPosition): CellPosition {
    return {
      sheetId,
      col:
        this.findVisibleHeader(sheetId, "COL", col, this.getters.getNumberCols(sheetId) - 1) ||
        this.findVisibleHeader(sheetId, "COL", col, 0) ||
        0,
      row:
        this.findVisibleHeader(sheetId, "ROW", row, this.getters.getNumberRows(sheetId) - 1) ||
        this.findVisibleHeader(sheetId, "ROW", row, 0) ||
        0,
    };
  }

  /**
   * Find the first visible header in the range [`from` => `to`].
   *
   * Both `from` and `to` are inclusive.
   */
  findVisibleHeader(
    sheetId: UID,
    dimension: Dimension,
    from: number,
    to: number
  ): number | undefined {
    if (from <= to) {
      for (let i = from; i <= to; i++) {
        if (
          this.getters.doesHeaderExist(sheetId, dimension, i) &&
          !this.isHeaderHidden(sheetId, dimension, i)
        ) {
          return i;
        }
      }
    }
    if (from > to) {
      for (let i = from; i >= to; i--) {
        if (
          this.getters.doesHeaderExist(sheetId, dimension, i) &&
          !this.isHeaderHidden(sheetId, dimension, i)
        ) {
          return i;
        }
      }
    }

    return undefined;
  }

  findLastVisibleColRowIndex(
    sheetId: UID,
    dimension: Dimension,
    { last, first }: { first: HeaderIndex; last: HeaderIndex }
  ): HeaderIndex {
    const lastVisibleIndex = range(last, first, -1).find(
      (index) => !this.isHeaderHidden(sheetId, dimension, index)
    );
    return lastVisibleIndex || first;
  }

  findFirstVisibleColRowIndex(sheetId: UID, dimension: Dimension) {
    const numberOfHeaders = this.getters.getNumberHeaders(sheetId, dimension);

    for (let i = 0; i < numberOfHeaders; i++) {
      if (dimension === "COL" && !this.isColHidden(sheetId, i)) {
        return i;
      }
      if (dimension === "ROW" && !this.isRowHidden(sheetId, i)) {
        return i;
      }
    }
    return undefined;
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheetData of data.sheets) {
      for (const [row, rowData] of Object.entries(sheetData.rows)) {
        rowData.isHidden = this.isRowHidden(sheetData.id, Number(row));
      }
    }
  }
}
