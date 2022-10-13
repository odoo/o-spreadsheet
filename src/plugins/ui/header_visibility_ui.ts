import { range } from "../../helpers";
import { Dimension, HeaderIndex, Position, UID } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class HeaderVisibilityUIPlugin extends UIPlugin {
  static getters = [
    "getNextVisibleCellPosition",
    "findVisibleHeader",
    "findLastVisibleColRowIndex",
    "findFirstVisibleColRowIndex",
    "isRowHidden",
    "isColHidden",
    "isHeaderHidden",
  ] as const;

  isRowHidden(sheetId: UID, index: number): boolean {
    return (
      this.getters.isRowHiddenByUser(sheetId, index) || this.getters.isRowFiltered(sheetId, index)
    );
  }

  isColHidden(sheetId: UID, index: number): boolean {
    return this.getters.isColHiddenByUser(sheetId, index);
  }

  isHeaderHidden(sheetId: UID, dimension: Dimension, index: number) {
    return dimension === "COL"
      ? this.isColHidden(sheetId, index)
      : this.isRowHidden(sheetId, index);
  }

  getNextVisibleCellPosition(sheetId: UID, col: number, row: number): Position {
    return {
      col: this.findVisibleHeader(sheetId, "COL", range(col, this.getters.getNumberCols(sheetId)))!,
      row: this.findVisibleHeader(sheetId, "ROW", range(row, this.getters.getNumberRows(sheetId)))!,
    };
  }

  findVisibleHeader(sheetId: UID, dimension: Dimension, indexes: number[]): number | undefined {
    return indexes.find(
      (index) =>
        this.getters.doesHeaderExist(sheetId, dimension, index) &&
        !this.isHeaderHidden(sheetId, dimension, index)
    );
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

    for (let i = 0; i < numberOfHeaders - 1; i++) {
      if (dimension === "COL" && !this.isColHidden(sheetId, i)) {
        return i;
      }
      if (dimension === "ROW" && !this.isRowHidden(sheetId, i)) {
        return i;
      }
    }
    return undefined;
  }
}
