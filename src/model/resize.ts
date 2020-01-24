import { GridState } from "./state";

/**
 * Update the size of the given column, by adding a delta (can be negative)
 * @param state GridState
 * @param index Index of the column
 * @param delta Delta add to the size
 */
export function updateColSize(state: GridState, index: number, delta: number) {
  const { cols } = state;
  const col = cols[index];
  col.size += delta;
  col.right += delta;
  for (let i = index + 1; i < state.cols.length; i++) {
    const col = cols[i];
    col.left += delta;
    col.right += delta;
  }
}
/**
 * Update the size of the given row, by adding a delta (can be negative)
 * @param state GridState
 * @param index Index of the row
 * @param delta Delta add to the size
 */
export function updateRowSize(state: GridState, index: number, delta: number) {
  const { rows } = state;
  const row = rows[index];
  row.size += delta;
  row.bottom += delta;
  for (let i = index + 1; i < state.rows.length; i++) {
    const row = rows[i];
    row.top += delta;
    row.bottom += delta;
  }
}

/**
 * Update the size of multiple columns, based on the size of one column.
 * The delta is added to the size of the based column, and the size of the others
 * columns is set to this size.
 *
 * @param state GridState
 * @param base Index of the based column
 * @param all Indexes of the columns to update
 * @param delta Delta to add to the size of the based column
 */
export function updateColsSize(state: GridState, base: number, all: Array<number>, delta: number) {
  const { cols } = state;
  const col = cols[base];
  const size = col.size + delta;
  updateColSize(state, base, delta);
  for (let col of all) {
    updateColSize(state, col, size - cols[col].size);
  }
}

/**
 * Update the size of multiple rows, based on the size of one row.
 * The delta is added to the size of the based row, and the size of the others
 * rows is set to this size.
 *
 * @param state GridState
 * @param base Index of the based row
 * @param all Indexes of the rows to update
 * @param delta Delta to add to the size of the based row
 */
export function updateRowsSize(state: GridState, base: number, all: Array<number>, delta: number) {
  const { rows } = state;
  const row = rows[base];
  const size = row.size + delta;
  updateRowSize(state, base, delta);
  for (let row of all) {
    updateRowSize(state, row, size - rows[row].size);
  }
}
