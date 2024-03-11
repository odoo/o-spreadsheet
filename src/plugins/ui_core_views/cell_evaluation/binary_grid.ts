import { CellPosition } from "../../../types";

type Bit = 0 | 1;

/**
 * Implements a fixed-sized grid or 2D matrix of bits.
 * based on https://github.com/zandaqo/structurae
 *
 * The grid is implemented as a 1D array of 32-bit integers, where each bit represents a cell in the grid.
 * It follows row-major order, with each row stored consecutively in 32-bit blocks.
 * Pads the number of columns to the next power of 2 to allow quick lookups with bitwise operations.
 *
 * Key terminology:
 * - bucket: Index of an item in the Uint32Array, a 32-bit integer.
 * - bitPosition: The position of a bit within the bucket 32-bit integer.
 */
export class BinaryGrid extends Uint32Array {
  private columnOffset = 0;
  cols = 0;
  rows = 0;

  /**
   * Creates a binary grid of specified dimensions.
   */
  static create(rows: number, columns: number): BinaryGrid {
    const columnOffset = log2Ceil(columns);
    const length = (rows << columnOffset) >> 5;
    const grid = new this(length + 1);
    grid.columnOffset = columnOffset;
    grid.cols = columns;
    grid.rows = rows;
    return grid;
  }

  /**
   * Returns the bit at given coordinates.
   */
  getValue(position: CellPosition): Bit {
    const [bucket, bitPosition] = this.getCoordinates(position);
    return ((this[bucket] >> bitPosition) & 1) as Bit;
  }

  /**
   * Sets the bit at given coordinates.
   */
  setValue(position: CellPosition, value: Bit) {
    const [bucket, bitPosition] = this.getCoordinates(position);
    const currentValue = (this[bucket] >> bitPosition) & 1;
    const hasBeenInserted = currentValue === 0 && value === 1;
    this[bucket] = (this[bucket] & ~(1 << bitPosition)) | (value << bitPosition);
    return hasBeenInserted;
    // Let's breakdown of the above line:
    // with an example with a 4-bit integer (instead of 32-bit).
    //
    // Let's say we want to set the bit at position 2 to 1 and the existing
    // bit sequence this[bucket] is 1001. The final bit sequence should be 1101.
    //
    // First, we clear the bit at position 2 by AND-ing this[bucket] with a
    // mask having all 1s except a 0 at the bit position (~ (1 << bitPosition)).
    // 1 << bitPosition is 0100 (shifting 0001 to the left by 2)
    // Inverting the bits with ~ gives the final mask ~(1 << bitPosition): 1011
    //
    // Then, we shift the value by the bit position (value << bitPosition: 0100)
    // and OR the result with the previous step's result:
    // (1001 & 1011) | 0100 = 1101
  }

  isEmpty() {
    return !this.some((bucket) => bucket !== 0);
  }

  fillAllPositions() {
    const thirtyTwoOnes = -1 >>> 0; // same as 2 ** 32 - 1, a 32-bit number with all bits set to 1
    this.fill(thirtyTwoOnes);
  }

  clear() {
    this.fill(0);
  }

  private getCoordinates(position: CellPosition): [bucket: number, position: number] {
    const { row, col } = position;
    const index = (row << this.columnOffset) + col;
    const bucket = index >> 5;
    return [bucket, index - (bucket << 5)];
  }
}

function log2Ceil(value: number) {
  // A faster version of Math.ceil(Math.log2(value)).
  if (value === 0) {
    return -Infinity;
  } else if (value < 0) {
    return NaN;
  }
  // --value handles the case where value is a power of 2
  return 32 - Math.clz32(--value);
}
