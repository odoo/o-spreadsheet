/*
 * Contains all method to update ranges with grid_manipulation
 */

import { toXC } from "./coordinates";
import { toZone } from "./zones";

export function updateRemoveColumns(range: string, columns: number[]): string | null {
  let { left, right, top, bottom } = toZone(range);
  columns = columns.slice().sort((a, b) => b - a);
  for (let column of columns) {
    if (left > column) {
      left -= 1;
    }
    if (left >= column || right >= column) {
      right -= 1;
    }
  }
  if (left > right) {
    return null;
  }
  return toXC(left, top) + ":" + toXC(right, bottom);
}

export function updateRemoveRows(range: string, rows: number[]): string | null {
  let { left, right, top, bottom } = toZone(range);
  rows = rows.slice().sort((a, b) => b - a);
  for (let row of rows) {
    if (top > row) {
      top -= 1;
    }
    if (top >= row || bottom >= row) {
      bottom -= 1;
    }
  }
  if (top > bottom) {
    return null;
  }
  return toXC(left, top) + ":" + toXC(right, bottom);
}

export function updateAddColumns(range: string, column: number, step: number): string | null {
  let { left, right, top, bottom } = toZone(range);
  if (left >= column) {
    left += step;
  }
  if (left >= column || right >= column) {
    right += step;
  }
  if (left > right) {
    return null;
  }
  return toXC(left, top) + ":" + toXC(right, bottom);
}

export function updateAddRows(range: string, row: number, step: number): string | null {
  let { left, right, top, bottom } = toZone(range);
  if (top >= row) {
    top += step;
  }
  if (top >= row || bottom >= row) {
    bottom += step;
  }
  if (top > bottom) {
    return null;
  }
  return toXC(left, top) + ":" + toXC(right, bottom);
}
