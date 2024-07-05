import { compile } from "../../../formulas";
import { matrixMap } from "../../../functions/helpers";
import { forEachPositionsInZone, JetSet, lazy, toXC } from "../../../helpers";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../../../helpers/cells";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import {
  Cell,
  CellPosition,
  CellValue,
  CellValueType,
  EvaluatedCell,
  FormulaCell,
  Getters,
  isMatrix,
  Matrix,
  Range,
  UID,
  ValueAndFormat,
} from "../../../types";
import { CellErrorType, CircularDependencyError, EvaluationError } from "../../../types/errors";
import { buildCompilationParameters, CompilationParameters } from "./compilation_parameters";
import { FormulaDependencyGraph } from "./formula_dependency_graph";
import { RTreeBoundingBox } from "./r_tree";
import { SpreadingRelation } from "./spreading_relation";

type PositionDict<T> = Map<PositionId, T>;

/**
 * A CellPosition encoded as an integer
 */
export type PositionId = bigint;

const MAX_ITERATION = 30;

export class Evaluator {
  private readonly getters: Getters;
  private compilationParams: CompilationParameters;
  private readonly encoder = new PositionBitsEncoder();

  private evaluatedCells: PositionDict<EvaluatedCell> = new Map();
  private formulaDependencies = lazy(new FormulaDependencyGraph(this.encoder));
  private blockedArrayFormulas = new Set<PositionId>();
  private spreadingRelations = new SpreadingRelation();

  constructor(private readonly context: ModelConfig["custom"], getters: Getters) {
    this.getters = getters;
    this.compilationParams = buildCompilationParameters(
      this.context,
      this.getters,
      this.computeAndSave.bind(this)
    );
  }

  getEvaluatedCell(position: CellPosition): EvaluatedCell {
    return (
      this.evaluatedCells.get(this.encoder.encode(position)) ||
      createEvaluatedCell("", { locale: this.getters.getLocale() })
    );
  }

  getSpreadPositionsOf(position: CellPosition): CellPosition[] {
    const positionId = this.encoder.encode(position);
    if (!this.spreadingRelations.isArrayFormula(positionId)) {
      return [];
    }
    return Array.from(this.spreadingRelations.getArrayResultPositionIds(positionId)).map(
      (positionId) => this.encoder.decode(positionId)
    );
  }

  getArrayFormulaSpreadingOn(position: CellPosition): CellPosition | undefined {
    const positionId = this.encoder.encode(position);
    const formulaPosition = this.getArrayFormulaSpreadingOnId(positionId);
    return formulaPosition !== undefined ? this.encoder.decode(formulaPosition) : undefined;
  }

  getEvaluatedPositions(): CellPosition[] {
    return [...this.evaluatedCells.keys()].map((p) => this.encoder.decode(p));
  }

  private getArrayFormulaSpreadingOnId(positionId: PositionId): PositionId | undefined {
    if (!this.spreadingRelations.hasArrayFormulaResult(positionId)) {
      return undefined;
    }
    const arrayFormulas = this.spreadingRelations.getFormulaPositionsSpreadingOn(positionId);
    return Array.from(arrayFormulas).find(
      (positionId) => !this.blockedArrayFormulas.has(positionId)
    );
  }

  updateDependencies(position: CellPosition) {
    const positionId = this.encoder.encode(position);
    this.formulaDependencies().removeAllDependencies(positionId);
    const dependencies = this.getDirectDependencies(positionId);
    this.formulaDependencies().addDependencies(positionId, dependencies);
  }

  private updateCompilationParameters() {
    // rebuild the compilation parameters (with a clean cache)
    this.compilationParams = buildCompilationParameters(
      this.context,
      this.getters,
      this.computeAndSave.bind(this)
    );
  }

  evaluateCells(positions: CellPosition[]) {
    const cells: PositionId[] = positions.map((p) => this.encoder.encode(p));
    const cellsToCompute = new JetSet<PositionId>(cells);
    const arrayFormulasPositionIds = this.getArrayFormulasImpactedByChangesOf(cells);
    cellsToCompute.addMany(this.getCellsDependingOn(cells));
    cellsToCompute.addMany(arrayFormulasPositionIds);
    cellsToCompute.addMany(this.getCellsDependingOn(arrayFormulasPositionIds));
    this.evaluate(cellsToCompute);
  }

  private getArrayFormulasImpactedByChangesOf(
    positionIds: Iterable<PositionId>
  ): Iterable<PositionId> {
    const impactedPositionIds = new JetSet<PositionId>();

    for (const positionId of positionIds) {
      const content = this.getCell(positionId)?.content;
      const arrayFormulaPositionId = this.getArrayFormulaSpreadingOnId(positionId);
      if (arrayFormulaPositionId !== undefined) {
        // take into account new collisions.
        impactedPositionIds.add(arrayFormulaPositionId);
      }
      if (!content) {
        // The previous content could have blocked some array formulas
        impactedPositionIds.addMany(this.getArrayFormulasBlockedBy(positionId));
      }
    }
    return impactedPositionIds;
  }

  buildDependencyGraph() {
    this.blockedArrayFormulas = new Set<PositionId>();
    this.spreadingRelations = new SpreadingRelation();
    this.formulaDependencies = lazy(() => {
      const dependencies = [...this.getAllCells()].flatMap((positionId) =>
        this.getDirectDependencies(positionId)
          .filter((range) => !range.invalidSheetName && !range.invalidXc)
          .map((range) => ({
            data: positionId,
            boundingBox: {
              zone: range.zone,
              sheetId: range.sheetId,
            },
          }))
      );
      return new FormulaDependencyGraph(this.encoder, dependencies);
    });
  }

  evaluateAllCells() {
    this.evaluatedCells = new Map();
    this.evaluate(this.getAllCells());
  }

  evaluateFormula(sheetId: UID, formulaString: string): CellValue | Matrix<CellValue> {
    const compiledFormula = compile(formulaString);

    const ranges: Range[] = compiledFormula.dependencies.map((xc) =>
      this.getters.getRangeFromSheetXC(sheetId, xc)
    );
    this.updateCompilationParameters();
    const array = compiledFormula.execute(ranges, ...this.compilationParams);
    if (isMatrix(array)) {
      return matrixMap(array, (cell) => cell.value);
    }
    return array.value;
  }

  private getAllCells(): JetSet<PositionId> {
    const positionIds = new JetSet<PositionId>();
    for (const sheetId of this.getters.getSheetIds()) {
      const cellIds = this.getters.getCells(sheetId);
      for (const cellId in cellIds) {
        positionIds.add(this.encoder.encode(this.getters.getCellPosition(cellId)));
      }
    }
    return positionIds;
  }

  /**
   * Return the position of formulas blocked by the given position
   * as well as all their dependencies.
   */
  private getArrayFormulasBlockedBy(positionId: PositionId): Iterable<PositionId> {
    if (!this.spreadingRelations.hasArrayFormulaResult(positionId)) {
      return [];
    }
    const arrayFormulas = this.spreadingRelations.getFormulaPositionsSpreadingOn(positionId);
    const cells = new JetSet<PositionId>(arrayFormulas);
    const arrayFormulaPositionId = this.getArrayFormulaSpreadingOnId(positionId);
    if (arrayFormulaPositionId) {
      // ignore the formula spreading on the position. Keep only the blocked ones
      cells.delete(arrayFormulaPositionId);
    }
    cells.addMany(this.getCellsDependingOn(cells));
    return cells;
  }

  private nextPositionsToUpdate = new JetSet<PositionId>();
  private cellsBeingComputed = new Set<UID>();

  private evaluate(cells: JetSet<PositionId>) {
    this.cellsBeingComputed = new Set<UID>();
    this.nextPositionsToUpdate = cells;

    let currentIteration = 0;
    while (this.nextPositionsToUpdate.size && currentIteration++ < MAX_ITERATION) {
      this.updateCompilationParameters();
      const positionIds = Array.from(this.nextPositionsToUpdate);
      this.nextPositionsToUpdate.clear();
      for (let i = 0; i < positionIds.length; ++i) {
        const cell = positionIds[i];
        this.evaluatedCells.delete(cell);
      }
      for (let i = 0; i < positionIds.length; ++i) {
        const cell = positionIds[i];
        this.setEvaluatedCell(cell, this.computeCell(cell));
      }
    }
  }

  private setEvaluatedCell(positionId: PositionId, evaluatedCell: EvaluatedCell) {
    this.evaluatedCells.set(positionId, evaluatedCell);
  }

  private computeCell(positionId: PositionId): EvaluatedCell {
    const evaluation = this.evaluatedCells.get(positionId);
    if (evaluation) {
      return evaluation; // already computed
    }

    if (!this.blockedArrayFormulas.has(positionId)) {
      this.invalidateSpreading(positionId);
    }

    const cell = this.getCell(positionId);
    if (cell === undefined) {
      return createEvaluatedCell("", { locale: this.getters.getLocale() });
    }

    const cellId = cell.id;

    try {
      if (this.cellsBeingComputed.has(cellId)) {
        throw new CircularDependencyError();
      }
      this.cellsBeingComputed.add(cellId);
      return cell.isFormula
        ? this.computeFormulaCell(cell)
        : evaluateLiteral(cell.content, { format: cell.format, locale: this.getters.getLocale() });
    } catch (e) {
      return this.handleError(e, cell);
    } finally {
      this.cellsBeingComputed.delete(cellId);
    }
  }

  private computeAndSave(position: CellPosition) {
    const positionId = this.encoder.encode(position);
    const evaluatedCell = this.computeCell(positionId);
    if (!this.evaluatedCells.has(positionId)) {
      this.setEvaluatedCell(positionId, evaluatedCell);
    }
    return evaluatedCell;
  }

  private handleError(e: Error | any, cell: Cell): EvaluatedCell {
    if (!(e instanceof EvaluationError)) {
      e = new EvaluationError(CellErrorType.GenericError, e.message);
    }
    const __lastFnCalled = this.compilationParams[2].__lastFnCalled || "";
    e.message = e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled);
    return errorCell(e);
  }

  private computeFormulaCell(cellData: FormulaCell): EvaluatedCell {
    const cellId = cellData.id;
    this.compilationParams[2].__originCellXC = () => {
      // compute the value lazily for performance reasons
      const position = this.compilationParams[2].getters.getCellPosition(cellId);
      return toXC(position.col, position.row);
    };
    const formulaReturn = cellData.compiledFormula.execute(
      cellData.compiledFormula.dependencies,
      ...this.compilationParams
    );

    if (!isMatrix(formulaReturn)) {
      return createEvaluatedCell(formulaReturn.value, {
        format: cellData.format || formulaReturn.format,
        locale: this.getters.getLocale(),
      });
    }

    const formulaPosition = this.getters.getCellPosition(cellId);

    this.assertSheetHasEnoughSpaceToSpreadFormulaResult(formulaPosition, formulaReturn);

    const nbColumns = formulaReturn.length;
    const nbRows = formulaReturn[0].length;

    forEachSpreadPositionInMatrix(nbColumns, nbRows, this.updateSpreadRelation(formulaPosition));
    forEachSpreadPositionInMatrix(nbColumns, nbRows, this.checkCollision(formulaPosition));
    forEachSpreadPositionInMatrix(
      nbColumns,
      nbRows,
      // thanks to the isMatrix check above, we know that formulaReturn is MatrixFunctionReturn
      this.spreadValues(formulaPosition, formulaReturn)
    );
    this.invalidatePositionsDependingOnSpread(formulaPosition, nbColumns, nbRows);
    return createEvaluatedCell(formulaReturn[0][0].value, {
      format: cellData.format || formulaReturn[0][0]?.format,
      locale: this.getters.getLocale(),
    });
  }

  private invalidatePositionsDependingOnSpread(
    arrayFormulaPosition: CellPosition,
    nbColumns: number,
    nbRows: number
  ) {
    // the result matrix is split in 2 zones to exclude the array formula position
    const top = arrayFormulaPosition.row;
    const left = arrayFormulaPosition.col;
    const bottom = top + nbRows - 1;
    const leftColumnZone = {
      top: top + 1,
      bottom,
      left,
      right: left,
    };
    const rightPartZone = {
      top,
      bottom,
      left: left + 1,
      right: left + nbColumns - 1,
    };
    const sheetId = arrayFormulaPosition.sheetId;
    const invalidatedPositions = this.formulaDependencies().getCellsDependingOn([
      { sheetId, zone: rightPartZone },
      { sheetId, zone: leftColumnZone },
    ]);
    this.nextPositionsToUpdate.addMany(invalidatedPositions);
  }

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<ValueAndFormat>
  ) {
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;

    if (enoughCols && enoughRows) {
      return;
    }

    if (enoughCols) {
      throw new Error(_t("Result couldn't be automatically expanded. Please insert more rows."));
    }

    if (enoughRows) {
      throw new Error(_t("Result couldn't be automatically expanded. Please insert more columns."));
    }

    throw new Error(
      _t("Result couldn't be automatically expanded. Please insert more columns and rows.")
    );
  }

  private updateSpreadRelation({
    sheetId,
    col,
    row,
  }: CellPosition): (i: number, j: number) => void {
    const arrayFormulaPositionId = this.encoder.encode({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const resultPositionId = this.encoder.encode(position);
      this.spreadingRelations.addRelation({ resultPositionId, arrayFormulaPositionId });
    };
  }

  private checkCollision({ sheetId, col, row }: CellPosition): (i: number, j: number) => void {
    const formulaPositionId = this.encoder.encode({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId: sheetId, col: i + col, row: j + row };
      const rawCell = this.getters.getCell(position);
      if (
        rawCell?.content ||
        this.getters.getEvaluatedCell(position).type !== CellValueType.empty
      ) {
        this.blockedArrayFormulas.add(formulaPositionId);
        throw new Error(
          _t(
            "Array result was not expanded because it would overwrite data in %s.",
            toXC(position.col, position.row)
          )
        );
      }
      this.blockedArrayFormulas.delete(formulaPositionId);
    };
  }

  private spreadValues(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<ValueAndFormat>
  ): (i: number, j: number) => void {
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const cell = this.getters.getCell(position);
      const format = cell?.format;
      const evaluatedCell = createEvaluatedCell(matrixResult[i][j].value, {
        format: format || matrixResult[i][j]?.format,
        locale: this.getters.getLocale(),
      });

      const positionId = this.encoder.encode(position);

      this.setEvaluatedCell(positionId, evaluatedCell);
    };
  }

  private invalidateSpreading(positionId: PositionId) {
    if (!this.spreadingRelations.isArrayFormula(positionId)) {
      return;
    }
    for (const child of this.spreadingRelations.getArrayResultPositionIds(positionId)) {
      const content = this.getCell(child)?.content;
      if (content) {
        // there's no point at re-evaluating overlapping array formulas,
        // there's still a collision
        continue;
      }
      this.evaluatedCells.delete(child);
      this.nextPositionsToUpdate.addMany(this.getCellsDependingOn([child]));
      this.nextPositionsToUpdate.addMany(this.getArrayFormulasBlockedBy(child));
    }
    this.spreadingRelations.removeNode(positionId);
  }

  // ----------------------------------------------------------
  //                 COMMON FUNCTIONALITY
  // ----------------------------------------------------------

  private getDirectDependencies(positionId: PositionId): Range[] {
    const cell = this.getCell(positionId);
    if (!cell?.isFormula) {
      return [];
    }
    return cell.compiledFormula.dependencies;
  }

  private getCellsDependingOn(positionIds: Iterable<PositionId>): Iterable<PositionId> {
    const ranges: RTreeBoundingBox[] = [];
    for (const positionId of positionIds) {
      ranges.push(this.encoder.decodeToBoundingBox(positionId));
    }
    return this.formulaDependencies().getCellsDependingOn(ranges);
  }

  private getCell(positionId: PositionId): Cell | undefined {
    return this.getters.getCell(this.encoder.decode(positionId));
  }
}

function forEachSpreadPositionInMatrix(
  nbColumns: number,
  nbRows: number,
  callback: (i: number, j: number) => void
) {
  for (let i = 0; i < nbColumns; ++i) {
    for (let j = 0; j < nbRows; ++j) {
      if (i === 0 && j === 0) {
        continue;
      }
      callback(i, j);
    }
  }
}

/**
 * Encode (and decode) cell positions { sheetId, col, row }
 * to a single integer.
 *
 * `col` and `row` values are encoded on 21 bits each (max 2^21 = 2_097_152),
 * An incremental integer id is assigned to each different sheet id, starting at 0.
 *
 * e.g.
 * Given { col: 10, row: 4, sheetId: "abcde" }
 * we have:
 *  - row "4" encoded on 21 bits:  000000000000000000100
 *  - col "10" encoded on 21 bits: 000000000000000001010
 *  - sheetId: let's say it's the 4th sheetId met, encoded to: 11
 *
 * The final encoded value is found by concatenating the 3 bit sequences:
 *
 * sheetId: 11
 * col:       000000000000000001010
 * row:                            000000000000000000100
 * =>       11000000000000000001010000000000000000000100
 *
 * this binary sequence is the integer 13194160504836
 */
export class PositionBitsEncoder {
  private readonly sheetMapping: Record<string, PositionId> = {};
  private readonly inverseSheetMapping = new Map<PositionId, string>();

  constructor() {
    try {
      // @ts-ignore
      o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
      // @ts-ignore
      o_spreadsheet.__DEBUG__.decodePosition = this.decode.bind(this);
      // @ts-ignore
      o_spreadsheet.__DEBUG__.encodePosition = this.encode.bind(this);
    } catch (error) {}
  }

  /**
   * Encode a cell position to a single integer.
   */
  encode({ sheetId, col, row }: CellPosition): PositionId {
    return (this.encodeSheet(sheetId) << 42n) | (BigInt(col) << 21n) | BigInt(row);
  }

  encodeBoundingBox({ sheetId, zone }: RTreeBoundingBox): PositionId[] {
    const positions: PositionId[] = [];
    forEachPositionsInZone(zone, (col, row) => {
      positions.push(this.encode({ sheetId, col, row }));
    });
    return positions;
  }

  decode(id: PositionId): CellPosition {
    // keep only the last 21 bits by AND-ing the bit sequence with 21 ones
    const row = Number(id & 0b111111111111111111111n);
    const col = Number((id >> 21n) & 0b111111111111111111111n);
    const sheetId = this.decodeSheet(id >> 42n);
    return { sheetId, col, row };
  }

  decodeToBoundingBox(id: PositionId): RTreeBoundingBox {
    const { sheetId, col, row } = this.decode(id);
    return { sheetId, zone: { left: col, top: row, right: col, bottom: row } };
  }

  private encodeSheet(sheetId: UID): PositionId {
    const sheetKey = this.sheetMapping[sheetId];
    if (sheetKey === undefined) {
      const newSheetKey = BigInt(Object.keys(this.sheetMapping).length);
      this.sheetMapping[sheetId] = newSheetKey;
      this.inverseSheetMapping.set(newSheetKey, sheetId);
      return newSheetKey;
    }
    return sheetKey;
  }

  private decodeSheet(sheetKey: PositionId): UID {
    const sheetId = this.inverseSheetMapping.get(sheetKey);
    if (sheetId === undefined) {
      throw new Error("Sheet id not found");
    }
    return sheetId;
  }
}
