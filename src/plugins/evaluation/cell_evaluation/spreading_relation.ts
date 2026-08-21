import { PositionMap } from "../../../helpers/cells/position_map";
import { CellPosition, UID, Zone } from "../../../types/misc";
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
   * We have `resultsToArrayFormulas` is an R-tree looking like:
   * - (A2:C2) --> A2     meaning values in A2:C2 are the result of A2
   * - (B1:B4) --> B1     meaning values in B1:B4 are the result of B1
   *
   * Note that B2 is part of both zones because it can be the result of
   * A2 or B1.
   * Using an R-tree allows for fast insertions while still having
   * a relatively fast lookup.
   *
   * We have `arrayFormulasToResults` looking like:
   * - (A2) --> A2:C2     meaning A2 spreads on the zone A2:C2
   * - (B1) --> B1:B4     meaning B1 spreads on the zone B1:B4
   *
   */
  private readonly resultsToArrayFormulas = new SpreadsheetRTree<CellPosition>();
  private readonly arrayFormulasToResults: PositionMap<Zone> = new PositionMap();

  searchFormulaPositionsSpreadingOn(sheetId: UID, zone: Zone): CellPosition[] {
    return (
      this.resultsToArrayFormulas.search({ sheetId, zone }).map((node) => node.data) || EMPTY_ARRAY
    );
  }

  getArrayResultZone(formulasPosition: CellPosition): Zone | undefined {
    return this.arrayFormulasToResults.get(formulasPosition);
  }

  /**
   * Remove a spreading relation for a given array formula position
   * and its result zone
   */
  removeNode(position: CellPosition) {
    const resultZone = this.arrayFormulasToResults.get(position);
    if (!resultZone) {
      return;
    }
    this.resultsToArrayFormulas.remove({
      boundingBox: { sheetId: position.sheetId, zone: resultZone },
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

  isArrayFormula(position: CellPosition): boolean {
    return this.arrayFormulasToResults.has(position);
  }
}

const EMPTY_ARRAY = [] as const;
