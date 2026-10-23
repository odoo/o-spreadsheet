import { CellPosition, UID } from "../../../types";

export class PositionMap<T> {
  private map: Record<UID, Record<number, Record<number, T>>> = {};

  set({ sheetId, col, row }: CellPosition, value: T) {
    const map = this.map;
    if (!map[sheetId]) {
      map[sheetId] = {};
    }
    if (!map[sheetId][col]) {
      map[sheetId][col] = {};
    }
    map[sheetId][col][row] = value;
  }

  get({ sheetId, col, row }: CellPosition): T | undefined {
    return this.map[sheetId]?.[col]?.[row];
  }

  getSheet(sheetId: UID): Record<number, Record<number, T>> | undefined {
    return this.map[sheetId];
  }

  has({ sheetId, col, row }: CellPosition): boolean {
    return this.map[sheetId]?.[col]?.[row] !== undefined;
  }

  delete({ sheetId, col, row }: CellPosition) {
    delete this.map[sheetId]?.[col]?.[row];
  }

  *keys(): Generator<CellPosition> {
    const map = this.map;
    for (const sheetId in map) {
      for (const col in map[sheetId]) {
        for (const row in map[sheetId][col]) {
          yield { sheetId, col: parseInt(col), row: parseInt(row) };
        }
      }
    }
    return;
  }

  length(): number {
    let count = 0;
    const map = this.map;
    for (const sheetId in map) {
      for (const col in map[sheetId]) {
        for (const _ in map[sheetId][col]) {
          count++;
        }
      }
    }
    return count;
  }

  *keysForSheet(sheetId: UID): Generator<CellPosition> {
    const map = this.map[sheetId];
    if (!map) {
      return [];
    }
    for (const col in map) {
      for (const row in map[col]) {
        yield { sheetId, col: parseInt(col), row: parseInt(row) };
      }
    }
    return;
  }
}
