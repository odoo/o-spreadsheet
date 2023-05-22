import { ModelConfig } from "../../model";
import { _lt } from "../../translation";
import {
  Cell,
  CellPosition,
  CellPositionId,
  CellValue,
  CellValueType,
  EvaluatedCell,
  Format,
  FormulaCell,
  FormulaReturn,
  Getters,
  isMatrix,
  Matrix,
  MatrixArgFormat,
  MatrixFunctionReturn,
  PrimitiveFormat,
  UID,
} from "../../types";
import {
  CellErrorLevel,
  CellErrorType,
  CircularDependencyError,
  EvaluationError,
} from "../../types/errors";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../cells";
import { toXC } from "../coordinates";
import { JetSet } from "../misc";
import { mapToPositionsInZone } from "../zones";
import { buildCompilationParameters, CompilationParameters } from "./compilation_parameters";
import { FormulaDependencyGraph } from "./formula_dependency_graph";
import { SpreadingRelation } from "./spreading_relation";

type PositionDict<T> = Map<CellPositionId, T>;

const MAX_ITERATION = 30;

export class Evaluator {
  private getters: Getters;
  private compilationParams: CompilationParameters;

  private evaluatedCells: PositionDict<EvaluatedCell> = new Map();
  private formulaDependencies = new FormulaDependencyGraph();
  /**
   * contains the position of array formula that spreads on the grid
   * (and doesn't collide with other cells)
   * Used to clear the cells that have been filled by a
   * spread of when modifying this cell. It should be updated each time an
   * array formula is evaluated and correctly spread on other cells.
   */
  private blockedArrayFormulas = new Set<CellPositionId>();
  private spreadingRelations = new SpreadingRelation();

  private readonly e = new BitsPositionId();

  constructor(context: ModelConfig["custom"], getters: Getters) {
    this.getters = getters;
    this.compilationParams = buildCompilationParameters(context, getters, (position) =>
      this.computeCell(this.cellPositionToRc(position))
    );
  }

  getEvaluatedCell(position: CellPosition): EvaluatedCell {
    return this.evaluatedCells.get(this.cellPositionToRc(position)) || createEvaluatedCell("");
  }

  getArrayFormulaSpreadingOn(position: CellPosition): CellPosition | undefined {
    const rc = this.cellPositionToRc(position);
    const arrayFormulaRc = this.getArrayFormulaSpreadingOnRc(rc);
    return arrayFormulaRc ? this.rcToCellPosition(arrayFormulaRc) : undefined;
  }

  getPositions(): CellPosition[] {
    return [...this.evaluatedCells.keys()].map(this.rcToCellPosition);
  }

  private getArrayFormulaSpreadingOnRc(rc: CellPositionId): CellPositionId | undefined {
    if (!this.spreadingRelations.hasArrayFormulaResult(rc)) {
      return undefined;
    }
    const arrayFormulas = this.spreadingRelations.getArrayFormulasRc(rc);
    return Array.from(arrayFormulas).find((rc) => !this.blockedArrayFormulas.has(rc));
  }

  // ----------------------------------------------------------
  //        METHOD RELATING TO SPECIFIC CELLS EVALUATION
  // ----------------------------------------------------------

  updateDependencies(position: CellPosition) {
    const rc = this.cellPositionToRc(position);
    this.formulaDependencies.removeAllDependencies(rc);
    const dependencies = this.getDirectDependencies(rc);
    this.formulaDependencies.addDependencies(rc, dependencies);
  }

  evaluateCells(positions: CellPosition[]) {
    const cells: CellPositionId[] = positions.map(this.cellPositionToRc.bind(this));
    const cellsToCompute = new JetSet<CellPositionId>(cells);
    const arrayFormulas = this.getArrayFormulasImpactedByChangesOf(cells);
    cellsToCompute.add(...this.getCellsDependingOn(cells));
    cellsToCompute.add(...arrayFormulas);
    cellsToCompute.add(...this.getCellsDependingOn(arrayFormulas));
    this.evaluate(cellsToCompute);
  }

  private getArrayFormulasImpactedByChangesOf(
    rcs: Iterable<CellPositionId>
  ): Iterable<CellPositionId> {
    const impactedRcs = new JetSet<CellPositionId>();

    for (const rc of rcs) {
      const content = this.rcToCell(rc)?.content;
      const arrayFormulaRc = this.getArrayFormulaSpreadingOnRc(rc);
      if (arrayFormulaRc !== undefined) {
        // take into account new collisions.
        impactedRcs.add(arrayFormulaRc);
      }
      if (!content) {
        // The previous content could have blocked some array formulas
        impactedRcs.add(...this.getArrayFormulasBlockedByOrSpreadingOn(rc));
      }
    }
    return impactedRcs;
  }

  // ----------------------------------------------------------
  //      METHOD RELATING TO THE REVALUATION OF ALL CELLS
  // ----------------------------------------------------------

  buildDependencyGraph() {
    this.formulaDependencies = new FormulaDependencyGraph();
    this.blockedArrayFormulas = new Set<CellPositionId>();
    this.spreadingRelations = new SpreadingRelation();
    for (const rc of this.getAllCells()) {
      const dependencies = this.getDirectDependencies(rc);
      this.formulaDependencies.addDependencies(rc, dependencies);
    }
  }

  evaluateAllCells() {
    this.evaluatedCells = new Map();
    this.evaluate(this.getAllCells());
  }

  private getAllCells(): JetSet<CellPositionId> {
    const rcs = new JetSet<CellPositionId>();
    for (const sheetId of this.getters.getSheetIds()) {
      const cellIds = this.getters.getCells(sheetId);
      for (const cellId in cellIds) {
        rcs.add(this.cellPositionToRc(this.getters.getCellPosition(cellId)));
      }
    }
    return rcs;
  }

  private getArrayFormulasBlockedByOrSpreadingOn(rc: CellPositionId): Iterable<CellPositionId> {
    if (!this.spreadingRelations.hasArrayFormulaResult(rc)) {
      return [];
    }
    const arrayFormulas = this.spreadingRelations.getArrayFormulasRc(rc);
    const cells = new JetSet<CellPositionId>(arrayFormulas);
    cells.add(...this.getCellsDependingOn(arrayFormulas));
    return cells;
  }

  // ----------------------------------------------------------
  //                 EVALUATION MAIN PROCESS
  // ----------------------------------------------------------

  private nextRcsToUpdate = new JetSet<CellPositionId>();
  private cellsBeingComputed = new Set<UID>();

  /**
   * @param cells ordered topologically! TODO explain this better
   */
  private evaluate(cells: JetSet<CellPositionId>) {
    this.cellsBeingComputed = new Set<UID>();
    this.nextRcsToUpdate = cells;

    let currentIteration = 0;
    while (this.nextRcsToUpdate.size && currentIteration++ < MAX_ITERATION) {
      const rcs = Array.from(this.nextRcsToUpdate);
      this.nextRcsToUpdate.clear();
      for (let i = 0; i < rcs.length; ++i) {
        const cell = rcs[i];
        this.evaluatedCells.delete(cell);
      }
      for (let i = 0; i < rcs.length; ++i) {
        const cell = rcs[i];
        this.setEvaluatedCell(cell, this.computeCell(cell));
      }
    }
  }

  private setEvaluatedCell(rc: CellPositionId, evaluatedCell: EvaluatedCell) {
    if (this.nextRcsToUpdate.has(rc)) {
      this.nextRcsToUpdate.delete(rc);
    }
    this.evaluatedCells.set(rc, evaluatedCell);
  }

  private computeCell(rc: CellPositionId): EvaluatedCell {
    const evaluation = this.evaluatedCells.get(rc);
    if (evaluation) {
      return evaluation; // already computed
    }

    if (!this.blockedArrayFormulas.has(rc)) {
      this.invalidateSpreading(rc);
    }

    const cell = this.rcToCell(rc);
    if (cell === undefined) {
      return createEvaluatedCell("");
    }

    const cellId = cell.id;

    try {
      if (this.cellsBeingComputed.has(cellId)) {
        throw new CircularDependencyError();
      }
      this.cellsBeingComputed.add(cellId);
      return cell.isFormula
        ? this.computeFormulaCell(cell)
        : evaluateLiteral(cell.content, cell.format);
    } catch (e) {
      return this.handleError(e, cell);
    } finally {
      this.cellsBeingComputed.delete(cellId);
    }
  }

  private handleError(e: Error | any, cell: Cell): EvaluatedCell {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    const msg = e?.errorType || CellErrorType.GenericError;
    // apply function name
    const __lastFnCalled = this.compilationParams[2].__lastFnCalled || "";
    const error = new EvaluationError(
      msg,
      e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled),
      e.logLevel !== undefined ? e.logLevel : CellErrorLevel.error
    );
    return errorCell(cell.content, error);
  }

  private computeFormulaCell(cellData: FormulaCell): EvaluatedCell {
    const cellId = cellData.id;
    this.compilationParams[2].__originCellXC = () => {
      // compute the value lazily for performance reasons
      const position = this.compilationParams[2].getters.getCellPosition(cellId);
      return toXC(position.col, position.row);
    };
    const formulaReturn = cellData.compiledFormula.execute(
      cellData.dependencies,
      ...this.compilationParams
    );

    assertFormulaReturnHasConsistentDimensions(formulaReturn);

    const { value: computedValue, format: computedFormat } = formulaReturn;

    if (!isMatrix(computedValue)) {
      return createEvaluatedCell(
        computedValue,
        cellData.format || (computedFormat as string | undefined)
      );
    }

    const formulaPosition = this.getters.getCellPosition(cellId);

    this.assertSheetHasEnoughSpaceToSpreadFormulaResult(formulaPosition, computedValue);

    forEachSpreadPositionInMatrix(computedValue, this.updateSpreadRelation(formulaPosition));
    forEachSpreadPositionInMatrix(computedValue, this.checkCollision(formulaPosition));
    forEachSpreadPositionInMatrix(
      computedValue,
      // due the isMatrix check above, we know that formulaReturn is MatrixFunctionReturn
      this.spreadValues(formulaPosition, formulaReturn as MatrixFunctionReturn)
    );

    const formatFromPosition = formatFromPositionAccess(computedFormat);
    return createEvaluatedCell(computedValue[0][0], cellData.format || formatFromPosition(0, 0));
  }

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<CellValue>
  ) {
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;

    if (enoughCols && enoughRows) {
      return;
    }

    if (enoughCols) {
      throw new Error(_lt("Result couldn't be automatically expanded. Please insert more rows."));
    }

    if (enoughRows) {
      throw new Error(
        _lt("Result couldn't be automatically expanded. Please insert more columns.")
      );
    }

    throw new Error(
      _lt("Result couldn't be automatically expanded. Please insert more columns and rows.")
    );
  }

  private updateSpreadRelation({
    sheetId,
    col,
    row,
  }: CellPosition): (i: number, j: number) => void {
    const formulaRc = this.cellPositionToRc({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const rc = this.cellPositionToRc(position);
      this.spreadingRelations.addRelation({ resultRc: rc, arrayFormulaRc: formulaRc });
    };
  }

  private checkCollision({ sheetId, col, row }: CellPosition): (i: number, j: number) => void {
    const formulaRc = this.cellPositionToRc({ sheetId, col, row });
    return (i: number, j: number) => {
      const position = { sheetId: sheetId, col: i + col, row: j + row };
      const rawCell = this.getters.getCell(position);
      if (
        rawCell?.content ||
        this.getters.getEvaluatedCell(position).type !== CellValueType.empty
      ) {
        this.blockedArrayFormulas.add(formulaRc);
        throw new Error(
          _lt(
            "Array result was not expanded because it would overwrite data in %s.",
            toXC(position.col, position.row)
          )
        );
      }
      this.blockedArrayFormulas.delete(formulaRc);
    };
  }

  private spreadValues(
    { sheetId, col, row }: CellPosition,
    matrixResult: MatrixFunctionReturn
  ): (i: number, j: number) => void {
    const formatFromPosition = formatFromPositionAccess(matrixResult.format);
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const cell = this.getters.getCell(position);
      const format = cell?.format;
      const evaluatedCell = createEvaluatedCell(
        matrixResult.value[i][j],
        format || formatFromPosition(i, j)
      );

      const rc = this.cellPositionToRc(position);

      this.setEvaluatedCell(rc, evaluatedCell);

      // check if formula dependencies present in the spread zone
      // if so, they need to be recomputed
      this.nextRcsToUpdate.add(...this.getCellsDependingOn([rc]));
    };
  }

  private invalidateSpreading(rc: CellPositionId) {
    if (!this.spreadingRelations.isArrayFormula(rc)) {
      return;
    }
    for (const child of this.spreadingRelations.getArrayResultsRc(rc)) {
      const content = this.rcToCell(child)?.content;
      if (content) {
        // there's no point at re-evaluating overlapping array formulas,
        // there's still a collision
        continue;
      }
      this.evaluatedCells.delete(child);
      this.nextRcsToUpdate.add(...this.getCellsDependingOn([child]));
      this.nextRcsToUpdate.add(...this.getArrayFormulasBlockedByOrSpreadingOn(child));
    }
    this.spreadingRelations.removeNode(rc);
  }

  // ----------------------------------------------------------
  //                 COMMON FUNCTIONALITY
  // ----------------------------------------------------------

  private getDirectDependencies(thisRc: CellPositionId): CellPositionId[] {
    const cell = this.rcToCell(thisRc);
    if (!cell?.isFormula) {
      return [];
    }
    const dependencies: CellPositionId[] = [];
    for (const range of cell.dependencies) {
      if (range.invalidSheetName || range.invalidXc) {
        continue;
      }
      const sheetId = range.sheetId;
      mapToPositionsInZone(range.zone, (col, row) => {
        dependencies.push(this.cellPositionToRc({ sheetId, col, row }));
      });
    }
    return dependencies;
  }

  private getCellsDependingOn(rcs: Iterable<CellPositionId>): Iterable<CellPositionId> {
    return this.formulaDependencies.getCellsDependingOn(rcs);
  }

  private rcToCell(rc: CellPositionId): Cell | undefined {
    return this.getters.getCell(this.rcToCellPosition(rc));
  }

  cellPositionToRc(position: CellPosition): CellPositionId {
    return this.e.encodePosition(position);
  }

  rcToCellPosition(rc: CellPositionId): CellPosition {
    return this.e.decodePosition(rc);
  }
}

function forEachSpreadPositionInMatrix(
  matrix: Matrix<CellValue>,
  callback: (i: number, j: number) => void
) {
  for (let i = 0; i < matrix.length; ++i) {
    for (let j = 0; j < matrix[i].length; ++j) {
      if (i === 0 && j === 0) {
        continue;
      }
      callback(i, j);
    }
  }
}

function formatFromPositionAccess(
  format: Format | MatrixArgFormat | undefined
): (i: number, j: number) => PrimitiveFormat {
  return isMatrix(format) ? (i: number, j: number) => format[i][j] : () => format;
}

function assertFormulaReturnHasConsistentDimensions(formulaReturn: FormulaReturn) {
  const { value: computedValue, format: computedFormat } = formulaReturn;
  if (!isMatrix(computedValue)) {
    if (isMatrix(computedFormat)) {
      throw new Error("A format matrix should never be associated with a scalar value");
    }
    return;
  }
  if (isMatrix(computedFormat)) {
    const sameDimensions =
      computedValue.length === computedFormat.length &&
      computedValue[0].length === computedFormat[0].length;
    if (!sameDimensions) {
      throw new Error("Formats and values should have the same dimensions!");
    }
  }
}

class BitsPositionId {
  private readonly sheetMapping: Record<string, CellPositionId> = {};
  private readonly inverseSheetMapping = new Map<CellPositionId, string>();

  constructor() {
    try {
      // @ts-ignore
      o_spreadsheet.__DEBUG__ = o_spreadsheet.__DEBUG__ || {};
      // @ts-ignore
      o_spreadsheet.__DEBUG__.decodePosition = this.decodePosition.bind(this);
    } catch (error) {}
  }

  encodePosition({ sheetId, col, row }: CellPosition): CellPositionId {
    return (this.encodeSheet(sheetId) << 42n) | (BigInt(col) << 21n) | BigInt(row);
  }

  decodePosition(key: CellPositionId): CellPosition {
    const row = Number(key & 0xffffn);
    const col = Number((key >> 21n) & 0xffffn);
    const sheetId = this.decodeSheet(key >> 42n);
    return { sheetId, col, row };
  }

  private encodeSheet(sheetId: UID): CellPositionId {
    const sheetKey = this.sheetMapping[sheetId];
    if (sheetKey === undefined) {
      const newSheetKey = BigInt(Object.keys(this.sheetMapping).length);
      this.sheetMapping[sheetId] = newSheetKey;
      this.inverseSheetMapping.set(newSheetKey, sheetId);
      return newSheetKey;
    }
    return sheetKey;
  }

  private decodeSheet(sheetKey: CellPositionId): UID {
    const sheetId = this.inverseSheetMapping.get(sheetKey);
    if (sheetId === undefined) {
      throw new Error("Sheet id not found");
    }
    return sheetId;
  }
}
