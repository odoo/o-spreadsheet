/**
 * This class is an implementation of a undirected Graph.
 *
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
 * We will have array formula relation like:
 * - (B2) --> (A2, B1)
 * - (C2) --> (A2)
 * - (B3) --> (B1)
 * - (B4) --> (B1)
 *
 * We will have array result relation like:
 * - (A2) --> (B2, C2)
 * - (B1) --> (B2, B3, B4)
 *
 *                B4
 *                 ^
 *                 |
 *         B3 <-- B1 --> B2 <-- A2 --> C2
 *
 */
export class SpreadingRelation {
  readonly resultsToArrayFormulas: Record<string, Set<string>> = {};
  readonly arrayFormulasToResults: Record<string, Set<string>> = {};

  getArrayFormulasRc(resultRc: string): Set<string> {
    return this.resultsToArrayFormulas[resultRc] || new Set<string>();
  }

  getArrayResultsRc(arrayFormulaRc: string): Set<string> {
    return this.arrayFormulasToResults[arrayFormulaRc] || new Set<string>();
  }

  /**
   * Remove a node, also remove it from other nodes adjacency list
   */
  removeNode(rc: string) {
    delete this.resultsToArrayFormulas[rc];
    delete this.arrayFormulasToResults[rc];
  }

  /**
   * Create a spreading relation between two cells
   */
  addRelation({
    arrayFormulaRc: arrayFormulaRc,
    resultRc: resultRc,
  }: {
    arrayFormulaRc: string;
    resultRc: string;
  }): void {
    if (!(resultRc in this.resultsToArrayFormulas)) {
      this.resultsToArrayFormulas[resultRc] = new Set<string>();
    }
    this.resultsToArrayFormulas[resultRc].add(arrayFormulaRc);
    if (!(arrayFormulaRc in this.arrayFormulasToResults)) {
      this.arrayFormulasToResults[arrayFormulaRc] = new Set<string>();
    }
    this.arrayFormulasToResults[arrayFormulaRc].add(resultRc);
  }

  hasResult(rc: string): boolean {
    return rc in this.resultsToArrayFormulas;
  }
}
