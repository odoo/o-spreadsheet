import { CellPosition } from "../../../types";
import { PositionMap } from "./position_map";

/**
 * Contains, for each cell, the array
 * formulas that could potentially spread on it
 * This is essentially a two way mapping between array formulas
 * and their results.
 *
 * As we don't allow two array formulas to spread on the same cell, this structure
 * is used to force the reevaluation of the potential spreaders of a cell when the
 * content of this cell is modified. This structure should be updated each time
 * an array formula is evaluated and try to spread on another cell.
 *
 */
export class SpreadingRelation {
  /**
   * Internal structure:
   * For something like
   * - A2:'=SPLIT("KAYAK", "A")'
   * - B1:'=TRANSPOSE(SPLIT("COYOTE", "O"))'
   *
   * Resulting in:
   * ```
   * -----------------
   * |   | A | B | C |
   * |---+---+---+---|
   * | 1 |   | C |   |
   * | 2 | K | Y | K |
   * | 3 |   | T |   |
   * | 4 |   | E |   |
   * -----------------
   * ```
   * We will have `resultsToArrayFormulas` looking like:
   * - (B2) --> (A2, B1)  meaning B2 can be the result of A2 OR B1
   * - (C2) --> (A2)      meaning C2 is the result of A2
   * - (B3) --> (B1)      meaning B3 is the result of B1
   * - (B4) --> (B1)      meaning B4 is the result of B1
   *
   * We will have `arrayFormulasToResults` looking like:
   * - (A2) --> (B2, C2)      meaning A2 spreads on B2 and C2
   * - (B1) --> (B2, B3, B4)  meaning B1 spreads on B2, B3 and B4
   *
   */
  private readonly resultsToArrayFormulas: PositionMap<CellPosition[]> = new PositionMap();
  private readonly arrayFormulasToResults: PositionMap<CellPosition[]> = new PositionMap();

  getFormulaPositionsSpreadingOn(resultPosition: CellPosition): Iterable<CellPosition> {
    return this.resultsToArrayFormulas.get(resultPosition) || EMPTY_ARRAY;
  }

  getArrayResultPositions(formulasPosition: CellPosition): Iterable<CellPosition> {
    return this.arrayFormulasToResults.get(formulasPosition) || EMPTY_ARRAY;
  }

  /**
   * Remove a node, also remove it from other nodes adjacency list
   */
  removeNode(position: CellPosition) {
    this.resultsToArrayFormulas.delete(position);
    this.arrayFormulasToResults.delete(position);
  }

  /**
   * Create a spreading relation between two cells
   */
  addRelation({
    arrayFormulaPosition,
    resultPosition,
  }: {
    arrayFormulaPosition: CellPosition;
    resultPosition: CellPosition;
  }): void {
    if (!this.resultsToArrayFormulas.has(resultPosition)) {
      this.resultsToArrayFormulas.set(resultPosition, []);
    }
    this.resultsToArrayFormulas.get(resultPosition)?.push(arrayFormulaPosition);
    if (!this.arrayFormulasToResults.has(arrayFormulaPosition)) {
      this.arrayFormulasToResults.set(arrayFormulaPosition, []);
    }
    this.arrayFormulasToResults.get(arrayFormulaPosition)?.push(resultPosition);
  }

  hasArrayFormulaResult(position: CellPosition): boolean {
    return this.resultsToArrayFormulas.has(position);
  }

  isArrayFormula(position: CellPosition): boolean {
    return this.arrayFormulasToResults.has(position);
  }
}

const EMPTY_ARRAY = [] as const;
