import { Position } from "../types/misc";
import { toCartesian } from "./coordinates";

export function expandXc(xc: string): Iterable<Position> {
  const pos = toCartesian(xc);
  return [pos];
}

/**
 * Helper to expand a range string like A1:B3 into all cell references in the range
 * @param start
 * @param end
 */
export function* expandRange(start: string, end: string): Generator<Position> {
  const startPos = toCartesian(start);
  const endPos = toCartesian(end);
  for (
    let col = Math.min(startPos.col, endPos.col);
    col <= Math.max(startPos.col, endPos.col);
    col++
  ) {
    for (
      let row = Math.min(startPos.row, endPos.row);
      row <= Math.max(startPos.row, endPos.row);
      row++
    ) {
      yield { col, row };
    }
  }
}
