import { CellPosition, UID } from "../..";

export class PositionMap<T> {
  private map: Record<UID, Record<number, Record<number, T>>> = {};

  constructor(entries: Iterable<readonly [CellPosition, T]> = []) {
    for (const [position, value] of entries) {
      this.set(position, value);
    }
  }

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

  setMany(values: Iterable<[CellPosition, T]>) {
    for (const [position, value] of values) {
      this.set(position, value);
    }
  }

  get({ sheetId, col, row }: CellPosition): T | undefined {
    return this.map[sheetId]?.[col]?.[row];
  }

  getSheet(sheetId: UID): Record<number, Record<number, T>> | undefined {
    return this.map[sheetId];
  }

  clearSheet(sheetId: UID) {
    delete this.map[sheetId];
  }

  has({ sheetId, col, row }: CellPosition): boolean {
    return this.map[sheetId]?.[col]?.[row] !== undefined;
  }

  delete({ sheetId, col, row }: CellPosition) {
    delete this.map[sheetId]?.[col]?.[row];
  }

  keys(): CellPosition[] {
    const map = this.map;
    const keys: CellPosition[] = [];
    for (const sheetId in map) {
      for (const col in map[sheetId]) {
        for (const row in map[sheetId][col]) {
          keys.push({ sheetId, col: parseInt(col), row: parseInt(row) });
        }
      }
    }
    return keys;
  }

  values(): T[] {
    const map = this.map;
    const values: T[] = [];
    for (const sheetId in map) {
      for (const col in map[sheetId]) {
        for (const row in map[sheetId][col]) {
          values.push(map[sheetId][col][row]);
        }
      }
    }
    return values;
  }

  keysForSheet(sheetId: UID): CellPosition[] {
    const map = this.map[sheetId];
    if (!map) {
      return [];
    }
    const keys: CellPosition[] = [];
    for (const col in map) {
      for (const row in map[col]) {
        keys.push({ sheetId, col: parseInt(col), row: parseInt(row) });
      }
    }
    return keys;
  }

  *entries(): IterableIterator<[CellPosition, T]> {
    const map = this.map;
    for (const position of this.keys()) {
      const { sheetId, col, row } = position;
      yield [position, map[sheetId][col][row]];
    }
  }
}
