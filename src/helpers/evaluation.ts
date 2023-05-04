/**
 * This file contains structures used in the cell evaluation
 * to track relations between formula cells.
 */

// TODO remove type
type Node = Set<string>;

/**
 * This class is an implementation of a directed Graph.
 *
 * For something like
 * - A1:"= B1 + SQRT(B2)"
 * - C1:"= B1";
 * - C2:"= C1"
 *
 * we will have something like:
 * - (B1) ---> (A1, C1)
 * - (B2) ---> (A1)
 * - (C1) ---> (C2)
 */
export class FormulaDependencyGraph {
  private readonly nodes: Map<string, Node> = new Map();

  removeAllDependencies(formulaRc) {
    for (const value of this.nodes.values()) {
      value.delete(formulaRc);
    }
  }

  addDependencies(formulaRc: string, dependencies: string[]): void {
    for (const dependency of dependencies) {
      let node = this.nodes.get(dependency);
      if (node) {
        node.add(formulaRc);
      } else {
        this.nodes.set(dependency, new Set([formulaRc]));
      }
    }
  }

  /**
   * Return the cell and all its dependencies in the order they should be evaluated.
   * This is called a topological ordering (excluding cycles)
   */
  getEvaluationOrder(rc: string): Set<string> {
    const visited: Set<string> = new Set<string>();
    const queue: string[] = [rc];

    while (queue.length > 0) {
      const node = queue.shift()!;
      visited.add(node);

      const adjacentNodes = this.nodes.get(node) || new Set<string>();
      for (const adjacentNode of adjacentNodes) {
        if (!visited.has(adjacentNode)) {
          queue.push(adjacentNode);
        }
      }
    }

    return visited;
  }
}

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
