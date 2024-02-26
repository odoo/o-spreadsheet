import { compile } from "../../../formulas";
import { implementationErrorMessage } from "../../../functions";
import { matrixMap } from "../../../functions/helpers";
import { lazy, positionToZone, toXC, union, unionPositionsToZone } from "../../../helpers";
import { createEvaluatedCell, evaluateLiteral } from "../../../helpers/cells";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import {
  CellPosition,
  CellValue,
  CellValueType,
  EvaluatedCell,
  FPayload,
  FormulaCell,
  Getters,
  Matrix,
  Range,
  RangeCompiledFormula,
  UID,
  Zone,
  isMatrix,
} from "../../../types";
import { CellErrorType, CircularDependencyError, EvaluationError } from "../../../types/errors";
import { CompilationParameters, buildCompilationParameters } from "./compilation_parameters";
import { FormulaDependencyGraph } from "./formula_dependency_graph";
import { PositionMap } from "./position_map";
import { PositionSet, SheetSizes } from "./position_set";
import { RTreeBoundingBox } from "./r_tree";
import { SpreadingRelation } from "./spreading_relation";

const MAX_ITERATION = 30;
const ERROR_CYCLE_CELL = createEvaluatedCell(new CircularDependencyError());
const EMPTY_CELL = createEvaluatedCell({ value: null });

export class Evaluator {
  private readonly getters: Getters;
  private compilationParams: CompilationParameters;

  private evaluatedCells: PositionMap<EvaluatedCell> = new PositionMap();
  private formulaDependencies = lazy(
    new FormulaDependencyGraph(this.createEmptyPositionSet.bind(this))
  );
  private blockedArrayFormulas = new PositionSet({});
  private spreadingRelations = new SpreadingRelation(this.createEmptyPositionSet.bind(this));

  constructor(private readonly context: ModelConfig["custom"], getters: Getters) {
    this.getters = getters;
    this.compilationParams = buildCompilationParameters(
      this.context,
      this.getters,
      this.computeAndSave.bind(this)
    );
  }

  getEvaluatedCell(position: CellPosition): EvaluatedCell {
    return this.evaluatedCells.get(position) || EMPTY_CELL;
  }

  getSpreadZone(position: CellPosition): Zone | undefined {
    if (!this.spreadingRelations.isArrayFormula(position)) {
      return undefined;
    }
    if (this.evaluatedCells.get(position)?.type === CellValueType.error) {
      return positionToZone(position);
    }
    const spreadPositions = Array.from(this.spreadingRelations.getArrayResultPositions(position));
    return union(positionToZone(position), unionPositionsToZone(spreadPositions));
  }

  getEvaluatedPositions(): CellPosition[] {
    return this.evaluatedCells.keys();
  }

  getArrayFormulaSpreadingOn(position: CellPosition): CellPosition | undefined {
    if (!this.spreadingRelations.hasArrayFormulaResult(position)) {
      return this.spreadingRelations.isArrayFormula(position) ? position : undefined;
    }
    const arrayFormulas = this.spreadingRelations.getFormulaPositionsSpreadingOn(position);
    return Array.from(arrayFormulas).find((position) => !this.blockedArrayFormulas.has(position));
  }

  updateDependencies(position: CellPosition) {
    this.formulaDependencies().removeAllDependencies(position);
    const dependencies = this.getDirectDependencies(position);
    this.formulaDependencies().addDependencies(position, dependencies);
  }

  addDependencies(position: CellPosition, dependencies: Range[]) {
    this.formulaDependencies().addDependencies(position, dependencies);
  }

  private updateCompilationParameters() {
    // rebuild the compilation parameters (with a clean cache)
    this.compilationParams = buildCompilationParameters(
      this.context,
      this.getters,
      this.computeAndSave.bind(this)
    );
    this.compilationParams.evalContext.updateDependencies = this.updateDependencies.bind(this);
    this.compilationParams.evalContext.addDependencies = this.addDependencies.bind(this);
  }

  private createEmptyPositionSet() {
    const sheetSizes: SheetSizes = {};
    for (const sheetId of this.getters.getSheetIds()) {
      sheetSizes[sheetId] = {
        rows: this.getters.getNumberRows(sheetId),
        cols: this.getters.getNumberCols(sheetId),
      };
    }
    return new PositionSet(sheetSizes);
  }

  evaluateCells(positions: CellPosition[]) {
    const cellsToCompute = this.createEmptyPositionSet();
    cellsToCompute.addMany(positions);
    const arrayFormulasPositions = this.getArrayFormulasImpactedByChangesOf(positions);
    cellsToCompute.addMany(this.getCellsDependingOn(positions));
    cellsToCompute.addMany(arrayFormulasPositions);
    cellsToCompute.addMany(this.getCellsDependingOn(arrayFormulasPositions));
    this.evaluate(cellsToCompute);
  }

  private getArrayFormulasImpactedByChangesOf(
    positions: Iterable<CellPosition>
  ): Iterable<CellPosition> {
    const impactedPositions = this.createEmptyPositionSet();

    for (const position of positions) {
      const content = this.getters.getCell(position)?.content;
      const arrayFormulaPosition = this.getArrayFormulaSpreadingOn(position);
      if (arrayFormulaPosition !== undefined) {
        // take into account new collisions.
        impactedPositions.add(arrayFormulaPosition);
      }
      if (!content) {
        // The previous content could have blocked some array formulas
        impactedPositions.addMany(this.getArrayFormulasBlockedByOrSpreadingOn(position));
      }
    }
    return impactedPositions;
  }

  buildDependencyGraph() {
    this.blockedArrayFormulas = this.createEmptyPositionSet();
    this.spreadingRelations = new SpreadingRelation(this.createEmptyPositionSet.bind(this));
    this.formulaDependencies = lazy(() => {
      const dependencies = [...this.getAllCells()].flatMap((position) =>
        this.getDirectDependencies(position)
          .filter((range) => !range.invalidSheetName && !range.invalidXc)
          .map((range) => ({
            data: position,
            boundingBox: {
              zone: range.zone,
              sheetId: range.sheetId,
            },
          }))
      );
      return new FormulaDependencyGraph(this.createEmptyPositionSet.bind(this), dependencies);
    });
  }

  evaluateAllCells() {
    console.time("evaluateAllCells");
    this.evaluatedCells = new PositionMap();
    this.evaluate(this.getAllCells());
    console.timeEnd("evaluateAllCells");
  }

  evaluateFormula(sheetId: UID, formulaString: string): CellValue | Matrix<CellValue> {
    const compiledFormula = compile(formulaString);

    const ranges: Range[] = compiledFormula.dependencies.map((xc) =>
      this.getters.getRangeFromSheetXC(sheetId, xc)
    );
    this.updateCompilationParameters();
    let result = updateEvalContextAndExecute(
      // todo: check if 'toScalar' should be called here
      { ...compiledFormula, dependencies: ranges },
      this.compilationParams,
      sheetId
    );
    if (isMatrix(result)) {
      if (result.length !== 1 || result[0].length !== 1) {
        return matrixMap(result, (cell) => cell.value);
      }
      result = result[0][0];
    }
    if (result.value === null) {
      return 0;
    }
    return result.value;
  }

  private getAllCells(): PositionSet {
    const positions = this.createEmptyPositionSet();
    positions.fillAllPositions();
    return positions;
  }

  private getArrayFormulasBlockedByOrSpreadingOn(position: CellPosition): Iterable<CellPosition> {
    if (!this.spreadingRelations.hasArrayFormulaResult(position)) {
      return [];
    }
    const arrayFormulas = this.spreadingRelations.getFormulaPositionsSpreadingOn(position);
    const positions = this.createEmptyPositionSet();
    positions.addMany(arrayFormulas);
    positions.addMany(this.getCellsDependingOn(arrayFormulas));
    return positions;
  }

  private nextPositionsToUpdate = new PositionSet({});
  private cellsBeingComputed = new Set<UID>();

  private evaluate(positions: PositionSet) {
    this.cellsBeingComputed = new Set<UID>();
    this.nextPositionsToUpdate = positions;

    let currentIteration = 0;
    while (!this.nextPositionsToUpdate.isEmpty() && currentIteration++ < MAX_ITERATION) {
      this.updateCompilationParameters();
      const positions = this.nextPositionsToUpdate.clear();
      for (let i = 0; i < positions.length; ++i) {
        this.evaluatedCells.delete(positions[i]);
      }
      for (let i = 0; i < positions.length; ++i) {
        const position = positions[i];
        const evaluatedCell = this.computeCell(position);
        if (evaluatedCell !== EMPTY_CELL) {
          this.evaluatedCells.set(position, evaluatedCell);
        }
      }
    }
  }

  private computeCell(position: CellPosition): EvaluatedCell {
    const evaluation = this.evaluatedCells.get(position);
    if (evaluation) {
      return evaluation; // already computed
    }

    if (!this.blockedArrayFormulas.has(position)) {
      this.invalidateSpreading(position);
    }
    this.spreadingRelations.removeNode(position);

    const cell = this.getters.getCell(position);
    if (cell === undefined) {
      return EMPTY_CELL;
    }

    const cellId = cell.id;
    const localeFormat = { format: cell.format, locale: this.getters.getLocale() };
    try {
      if (this.cellsBeingComputed.has(cellId)) {
        return ERROR_CYCLE_CELL;
      }
      this.cellsBeingComputed.add(cellId);
      return cell.isFormula
        ? this.computeFormulaCell(position.sheetId, cell)
        : evaluateLiteral(cell.content, localeFormat);
    } catch (e) {
      e.value = e?.value || CellErrorType.GenericError;
      e.message = e?.message || implementationErrorMessage;
      return createEvaluatedCell(e);
    } finally {
      this.cellsBeingComputed.delete(cellId);
    }
  }

  private computeAndSave(position: CellPosition) {
    const evaluatedCell = this.computeCell(position);
    if (!this.evaluatedCells.has(position)) {
      this.evaluatedCells.set(position, evaluatedCell);
    }
    return evaluatedCell;
  }

  private computeFormulaCell(sheetId: UID, cellData: FormulaCell): EvaluatedCell {
    const cellId = cellData.id;

    const formulaReturn = updateEvalContextAndExecute(
      cellData.compiledFormula,
      this.compilationParams,
      sheetId,
      cellId
    );

    if (!isMatrix(formulaReturn)) {
      return createEvaluatedCell(
        nullValueToZeroValue(formulaReturn),
        this.getters.getLocale(),
        cellData
      );
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

    return createEvaluatedCell(
      nullValueToZeroValue(formulaReturn[0][0]),
      this.getters.getLocale(),
      cellData
    );
  }

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<FPayload>
  ) {
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;

    if (enoughCols && enoughRows) {
      return;
    }

    if (enoughCols) {
      throw new EvaluationError(
        _t("Result couldn't be automatically expanded. Please insert more rows.")
      );
    }

    if (enoughRows) {
      throw new EvaluationError(
        _t("Result couldn't be automatically expanded. Please insert more columns.")
      );
    }

    throw new EvaluationError(
      _t("Result couldn't be automatically expanded. Please insert more columns and rows.")
    );
  }

  private updateSpreadRelation({
    sheetId,
    col,
    row,
  }: CellPosition): (i: number, j: number) => void {
    const arrayFormulaPosition = { sheetId, col, row };
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      this.spreadingRelations.addRelation({ resultPosition: position, arrayFormulaPosition });
    };
  }

  private checkCollision(formulaPosition: CellPosition): (i: number, j: number) => void {
    const { sheetId, col, row } = formulaPosition;
    return (i: number, j: number) => {
      const position = { sheetId: sheetId, col: i + col, row: j + row };
      const rawCell = this.getters.getCell(position);
      if (
        rawCell?.content ||
        this.getters.getEvaluatedCell(position).type !== CellValueType.empty
      ) {
        this.blockedArrayFormulas.add(formulaPosition);
        throw new EvaluationError(
          _t(
            "Array result was not expanded because it would overwrite data in %s.",
            toXC(position.col, position.row)
          )
        );
      }
      this.blockedArrayFormulas.delete(formulaPosition);
    };
  }

  private spreadValues(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<FPayload>
  ): (i: number, j: number) => void {
    return (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const cell = this.getters.getCell(position);
      const evaluatedCell = createEvaluatedCell(
        nullValueToZeroValue(matrixResult[i][j]),
        this.getters.getLocale(),
        cell
      );
      this.evaluatedCells.set(position, evaluatedCell);

      // check if formula dependencies present in the spread zone
      // if so, they need to be recomputed
      this.nextPositionsToUpdate.addMany(this.getCellsDependingOn([position]));
    };
  }

  private invalidateSpreading(position: CellPosition) {
    if (!this.spreadingRelations.isArrayFormula(position)) {
      return;
    }
    for (const child of this.spreadingRelations.getArrayResultPositions(position)) {
      const content = this.getters.getCell(child)?.content;
      if (content) {
        // there's no point at re-evaluating overlapping array formulas,
        // there's still a collision
        continue;
      }
      this.evaluatedCells.delete(child);
      this.nextPositionsToUpdate.addMany(this.getCellsDependingOn([child]));
      this.nextPositionsToUpdate.addMany(this.getArrayFormulasBlockedByOrSpreadingOn(child));
    }
  }

  // ----------------------------------------------------------
  //                 COMMON FUNCTIONALITY
  // ----------------------------------------------------------

  private getDirectDependencies(position: CellPosition): Range[] {
    const cell = this.getters.getCell(position);
    if (!cell?.isFormula) {
      return [];
    }
    return cell.compiledFormula.dependencies;
  }

  private getCellsDependingOn(positions: Iterable<CellPosition>): Iterable<CellPosition> {
    const ranges: RTreeBoundingBox[] = [];
    for (const position of positions) {
      ranges.push({ sheetId: position.sheetId, zone: positionToZone(position) });
    }
    return this.formulaDependencies().getCellsDependingOn(ranges);
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
 * This function replaces null payload values with 0.
 * This aids in the UI by ensuring that a cell with a
 * formula referencing an empty cell displays a value (0),
 * rather than appearing empty. This indicates that the
 * cell is the result of a non-empty content.
 */
function nullValueToZeroValue(fPayload: FPayload): FPayload {
  if (fPayload.value === null || fPayload.value === undefined) {
    // 'fPayload.value === undefined' is supposed to never happen, it's a safety net for javascript use
    return { ...fPayload, value: 0 };
  }
  return fPayload;
}

export function updateEvalContextAndExecute(
  compiledFormula: RangeCompiledFormula,
  compilationParams: CompilationParameters,
  sheetId: UID,
  cellId?: UID
) {
  compilationParams.evalContext.__originCellXC = lazy(() => {
    if (!cellId) {
      return undefined;
    }
    // compute the value lazily for performance reasons
    const position = compilationParams.evalContext.getters.getCellPosition(cellId);
    return toXC(position.col, position.row);
  });
  compilationParams.evalContext.__originSheetId = sheetId;
  return compiledFormula.execute(
    compiledFormula.dependencies,
    compilationParams.ensureRange,
    compilationParams.evalContext
  );
}
