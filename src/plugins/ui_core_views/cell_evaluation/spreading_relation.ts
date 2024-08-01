import type { PositionId } from "./evaluator";

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
  private readonly resultsToArrayFormulas: Map<PositionId, Set<PositionId>> = new Map();
  private readonly arrayFormulasToResults: Map<PositionId, Set<PositionId>> = new Map();

  getFormulaPositionsSpreadingOn(resultPositionId: PositionId): Iterable<PositionId> {
    return this.resultsToArrayFormulas.get(resultPositionId) || EMPTY_ARRAY;
  }

  getArrayResultPositionIds(formulasPositionId: PositionId): Iterable<PositionId> {
    return this.arrayFormulasToResults.get(formulasPositionId) || EMPTY_ARRAY;
  }

  /**
   * Remove a node, also remove it from other nodes adjacency list
   */
  removeNode(positionId: PositionId) {
    this.resultsToArrayFormulas.delete(positionId);
    this.arrayFormulasToResults.delete(positionId);
  }

  /**
   * Create a spreading relation between two cells
   */
  addRelation({
    arrayFormulaPositionId,
    resultPositionId,
  }: {
    arrayFormulaPositionId: PositionId;
    resultPositionId: PositionId;
  }): void {
    if (!this.resultsToArrayFormulas.has(resultPositionId)) {
      this.resultsToArrayFormulas.set(resultPositionId, new Set<PositionId>());
    }
    this.resultsToArrayFormulas.get(resultPositionId)?.add(arrayFormulaPositionId);
    if (!this.arrayFormulasToResults.has(arrayFormulaPositionId)) {
      this.arrayFormulasToResults.set(arrayFormulaPositionId, new Set<PositionId>());
    }
    this.arrayFormulasToResults.get(arrayFormulaPositionId)?.add(resultPositionId);
  }

  hasArrayFormulaResult(positionId: PositionId): boolean {
    return this.resultsToArrayFormulas.has(positionId);
  }

  isArrayFormula(positionId: PositionId): boolean {
    return this.arrayFormulasToResults.has(positionId);
  }
}

const EMPTY_ARRAY = [] as const;
