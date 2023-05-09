import { CellPosition } from "../../types";

export function cellPositionToRc(position: CellPosition): string {
  return `${position.row}!${position.col}!${position.sheetId}`;
}

export function rcToCellPosition(rc: string): CellPosition {
  // faster than  a split("!") by a factor 2
  const i1 = rc.indexOf("!");
  const row = rc.slice(0, i1);
  const position = rc.slice(i1 + 1);
  const i2 = position.indexOf("!");
  const col = position.slice(0, i2);
  const sheetId = position.slice(i2 + 1);
  return { sheetId, col: Number(col), row: Number(row) };
}
