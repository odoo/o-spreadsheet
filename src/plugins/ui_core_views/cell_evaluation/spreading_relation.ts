import { positionToZone } from "../../../helpers";
import { CellPosition, UID, Zone } from "../../../types";
import { PositionMap } from "./position_map";
import { SpreadsheetRTree } from "./r_tree";

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
   * Internal structure: TODO update
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
  private readonly resultsToArrayFormulas = new SpreadsheetRTree<CellPosition>();
  private readonly arrayFormulasToResults: PositionMap<Zone> = new PositionMap();

  getFormulaPositionsSpreadingOn(sheetId: UID, zone: Zone): Iterable<CellPosition> {
    return (
      this.resultsToArrayFormulas.search({ sheetId, zone }).map((node) => node.data) || EMPTY_ARRAY
    );
  }

  getArrayResultZone(formulasPosition: CellPosition): Zone {
    return this.arrayFormulasToResults.get(formulasPosition) || EMPTY_ZONE;
  }

  /**
   * Remove a node, also remove it from other nodes adjacency list
   */
  removeNode(position: CellPosition) {
    this.resultsToArrayFormulas.remove({
      boundingBox: { sheetId: position.sheetId, zone: positionToZone(position) },
      data: position,
    });
    this.arrayFormulasToResults.delete(position);
  }

  /**
   * Create a spreading relation between two cells
   */
  addRelation({
    arrayFormulaPosition,
    resultZone: resultPosition,
  }: {
    arrayFormulaPosition: CellPosition;
    resultZone: Zone;
  }): void {
    this.resultsToArrayFormulas.insert({
      boundingBox: { sheetId: arrayFormulaPosition.sheetId, zone: resultPosition },
      data: arrayFormulaPosition,
    });
    this.arrayFormulasToResults.set(arrayFormulaPosition, resultPosition);
  }

  hasArrayFormulaResult(position: CellPosition): boolean {
    return (
      this.resultsToArrayFormulas.search({
        sheetId: position.sheetId,
        zone: positionToZone(position),
      }).length > 0
    );
  }

  isArrayFormula(position: CellPosition): boolean {
    return this.arrayFormulasToResults.has(position);
  }
}

const EMPTY_ARRAY = [] as const;
// not sure about that...
const EMPTY_ZONE = { top: -1, bottom: -1, left: -1, right: -1 } as const;
