// Helper to expand a range string like A1:B3 into all cell references in the range
import { toCartesian } from "./coordinates";

export function* expandOne(xc: string): Generator<[number, number]> {
  const pos = toCartesian(xc);
  yield [pos.col, pos.row];
}

export function* expandRange(start: string, end: string): Generator<[number, number]> {
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
      yield [col, row];
    }
  }
}
