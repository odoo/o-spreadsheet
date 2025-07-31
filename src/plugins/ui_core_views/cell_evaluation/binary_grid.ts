import { MAX_COL } from "../../../helpers";
import { CellPosition } from "../../../types";

type Bit = 0 | 1;

const BLOCK_SIZE = 32;
const BLOCK_HEIGHT = 8;
const BLOCK_WIDTH = Math.floor(BLOCK_SIZE / BLOCK_HEIGHT);
const BLOCK_COLUMN_OFFSET = Math.ceil(Math.log2(BLOCK_WIDTH));

const HORIZONTAL_BLOCK_NUMBER = Math.ceil(MAX_COL / BLOCK_WIDTH);
const HORIZONTAL_BLOCK_COLUMN_OFFSET = Math.ceil(Math.log2(HORIZONTAL_BLOCK_NUMBER));

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
export class SparseBinaryGrid {
  private default: Bit = 0;
  private grid: Map<number, number> = new Map();
  /**
   * Creates a binary grid of specified dimensions.
   */
  constructor(prefillRows: number = 1, prefillColumns: number = 1) {
    // TODO
    return this;
  }

  /**
   * Returns the bit at given coordinates.
   */
  getValue(position: CellPosition): Bit {
    const [bucket, bitPosition] = this.getCoordinates(position);
    if (this.grid[bucket] === undefined) return this.default;
    return ((this.grid[bucket] >> bitPosition) & 1) as Bit;
  }

  /**
   * Sets the bit at given coordinates.
   */
  setValue(position: CellPosition, value: Bit) {
    const [bucket, bitPosition] = this.getCoordinates(position);
    if (this.grid[bucket] === undefined) this.grid[bucket] = this.default ? -1 : 0;
    const currentValue = (this.grid[bucket] >> bitPosition) & 1;
    const hasBeenInserted = !currentValue && value;
    this.grid[bucket] = (this.grid[bucket] & ~(1 << bitPosition)) | (value << bitPosition);
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
    return !this.default && !Object.values(this.grid).some((v) => v !== 0);
  }

  fillAllPositions() {
    this.clear();
    this.default = 1;
  }

  clear() {
    this.grid = new Map();
    this.default = 0;
  }

  private getCoordinates(position: CellPosition): [bucket: number, position: number] {
    const { row, col } = position;
    const bucket =
      (Math.floor(row / BLOCK_HEIGHT) << HORIZONTAL_BLOCK_COLUMN_OFFSET) +
      Math.floor(col / BLOCK_WIDTH);
    const index = (row % BLOCK_HEIGHT << BLOCK_COLUMN_OFFSET) + (col % BLOCK_WIDTH);
    return [bucket, index];
  }
}
