import { compile } from "../../../formulas";
import { handleError, implementationErrorMessage } from "../../../functions";
import { matrixMap } from "../../../functions/helpers";
import {
  aggregatePositionsToZones,
  excludeTopLeft,
  lazy,
  positionToZone,
  toXC,
  union,
} from "../../../helpers";
import { createEvaluatedCell, evaluateLiteral } from "../../../helpers/cells";
import { ModelConfig } from "../../../model";
import { onIterationEndEvaluationRegistry } from "../../../registries/evaluation_registry";
import { _t } from "../../../translation";
import {
  CellPosition,
  CellValueType,
  EvaluatedCell,
  FormulaCell,
  FunctionResultObject,
  GetSymbolValue,
  Getters,
  Matrix,
  Range,
  RangeCompiledFormula,
  UID,
  Zone,
  isMatrix,
} from "../../../types";
import {
  BadExpressionError,
  CellErrorType,
  CircularDependencyError,
  SplillBlockedError,
} from "../../../types/errors";
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
    return this.evaluatedCells.get(position) || EMPTY_CELL;
  }

  getSpreadZone(position: CellPosition, options = { ignoreSpillError: false }): Zone | undefined {
    const spreadZone = this.spreadingRelations.getArrayResultZone(position);
    if (!spreadZone) {
      return undefined;
    }
    const evaluatedCell = this.evaluatedCells.get(position);
    if (
      evaluatedCell?.type === CellValueType.error &&
      !(options.ignoreSpillError && evaluatedCell?.value === CellErrorType.SpilledBlocked)
    ) {
      return positionToZone(position);
    }
    return union(positionToZone(position), spreadZone);
  }

  getEvaluatedPositions(): CellPosition[] {
    return this.evaluatedCells.keys();
  }

  getEvaluatedPositionsInSheet(sheetId: UID): CellPosition[] {
    return this.evaluatedCells.keysForSheet(sheetId);
  }

  getArrayFormulaSpreadingOn(position: CellPosition): CellPosition | undefined {
    const hasArrayFormulaResult =
      this.getEvaluatedCell(position).type !== CellValueType.empty &&
      !this.getters.getCell(position)?.isFormula;
    if (!hasArrayFormulaResult) {
      return this.spreadingRelations.isArrayFormula(position) ? position : undefined;
    }
    const arrayFormulas = this.spreadingRelations.searchFormulaPositionsSpreadingOn(
      position.sheetId,
      positionToZone(position)
    );
    return Array.from(arrayFormulas).find((position) => !this.blockedArrayFormulas.has(position));
  }

  updateDependencies(position: CellPosition) {
    // removing dependencies is slow because it requires
    // to traverse the entire r-tree.
    // The data structure is optimized for searches the other way around
    this.formulaDependencies().removeAllDependencies(position);
    const dependencies = this.getDirectDependencies(position);
    this.formulaDependencies().addDependencies(position, dependencies);
  }

  private addDependencies(position: CellPosition, dependencies: Range[]) {
    this.formulaDependencies().addDependencies(position, dependencies);
    for (const range of dependencies) {
      const sheetId = range.sheetId;
      const { left, bottom, right, top } = range.zone;
      for (let col = left; col <= right; col++) {
        for (let row = top; row <= bottom; row++) {
          this.computeAndSave({ sheetId, col, row });
        }
      }
    }
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
    const start = performance.now();
    const cellsToCompute = this.createEmptyPositionSet();
    cellsToCompute.addMany(positions);
    const arrayFormulasPositions = this.getArrayFormulasImpactedByChangesOf(positions);
    cellsToCompute.addMany(this.getCellsDependingOn(positions));
    cellsToCompute.addMany(arrayFormulasPositions);
    cellsToCompute.addMany(this.getCellsDependingOn(arrayFormulasPositions));
    this.evaluate(cellsToCompute);
    console.debug("evaluate Cells", performance.now() - start, "ms");
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
        impactedPositions.add(position);
      }
    }
    const zonesBySheetIds = aggregatePositionsToZones(impactedPositions);
    for (const sheetId in zonesBySheetIds) {
      for (const zone of zonesBySheetIds[sheetId]) {
        impactedPositions.addMany(this.getArrayFormulasBlockedBy(sheetId, zone));
      }
    }
    return impactedPositions;
  }

  buildDependencyGraph() {
    this.blockedArrayFormulas = this.createEmptyPositionSet();
    this.spreadingRelations = new SpreadingRelation();
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
    const start = performance.now();
    this.evaluatedCells = new PositionMap();
    this.evaluate(this.getAllCells());
    console.debug("evaluate all cells", performance.now() - start, "ms");
  }

  evaluateFormulaResult(
    sheetId: UID,
    formulaString: string
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    const compiledFormula = compile(formulaString);

    const ranges: Range[] = compiledFormula.dependencies.map((xc) =>
      this.getters.getRangeFromSheetXC(sheetId, xc)
    );
    this.updateCompilationParameters();
    return this.evaluateCompiledFormula(sheetId, {
      ...compiledFormula,
      dependencies: ranges,
    });
  }

  evaluateCompiledFormula(
    sheetId: UID,
    compiledFormula: RangeCompiledFormula,
    getContextualSymbolValue?: GetSymbolValue
  ) {
    try {
      const result = updateEvalContextAndExecute(
        compiledFormula,
        this.compilationParams,
        sheetId,
        this.buildSafeGetSymbolValue(getContextualSymbolValue),
        this.compilationParams.evalContext.__originCellPosition
      );
      if (isMatrix(result)) {
        return matrixMap(result, nullValueToZeroValue);
      }
      return nullValueToZeroValue(result);
    } catch (error) {
      return handleError(error, "");
    }
  }

  private getAllCells(): PositionSet {
    const positions = this.createEmptyPositionSet();
    positions.fillAllPositions();
    return positions;
  }

  /**
   * Return the position of formulas blocked by the given positions
   * as well as all their dependencies.
   */
  private getArrayFormulasBlockedBy(sheetId: UID, zone: Zone): Iterable<CellPosition> {
    const arrayFormulaPositions = this.createEmptyPositionSet();
    const arrayFormulas = this.spreadingRelations.searchFormulaPositionsSpreadingOn(sheetId, zone);
    arrayFormulaPositions.addMany(arrayFormulas);
    const spilledPositions = [...arrayFormulas].filter(
      (position) => !this.blockedArrayFormulas.has(position)
    );
    if (spilledPositions.length) {
      // ignore the formula spreading on the position. Keep only the blocked ones
      arrayFormulaPositions.deleteMany(spilledPositions);
    }
    arrayFormulaPositions.addMany(this.getCellsDependingOn(arrayFormulaPositions));
    return arrayFormulaPositions;
  }

  private nextPositionsToUpdate = new PositionSet({});
  private cellsBeingComputed = new Set<UID>();
  private symbolsBeingComputed = new Set<string>();

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
        if (this.nextPositionsToUpdate.has(position)) {
          continue;
        }
        const evaluatedCell = this.computeCell(position);
        if (evaluatedCell !== EMPTY_CELL) {
          this.evaluatedCells.set(position, evaluatedCell);
        }
      }
      onIterationEndEvaluationRegistry.getAll().forEach((callback) => callback(this.getters));
    }
    if (currentIteration >= MAX_ITERATION) {
      console.warn("Maximum iteration reached while evaluating cells");
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

    if (this.spreadingRelations.isArrayFormula(position)) {
      this.spreadingRelations.removeNode(position);
    }

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
        ? this.computeFormulaCell(position, cell)
        : evaluateLiteral(cell, localeFormat);
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

  private computeFormulaCell(formulaPosition: CellPosition, cellData: FormulaCell): EvaluatedCell {
    const formulaReturn = updateEvalContextAndExecute(
      cellData.compiledFormula,
      this.compilationParams,
      formulaPosition.sheetId,
      this.buildSafeGetSymbolValue(),
      formulaPosition
    );

    if (!isMatrix(formulaReturn)) {
      return createEvaluatedCell(
        nullValueToZeroValue(formulaReturn),
        this.getters.getLocale(),
        cellData
      );
    }

    this.assertSheetHasEnoughSpaceToSpreadFormulaResult(formulaPosition, formulaReturn);

    const nbColumns = formulaReturn.length;
    const nbRows = formulaReturn[0].length;

    const resultZone = {
      top: formulaPosition.row,
      bottom: formulaPosition.row + nbRows - 1,
      left: formulaPosition.col,
      right: formulaPosition.col + nbColumns - 1,
    };
    this.spreadingRelations.addRelation({ resultZone, arrayFormulaPosition: formulaPosition });
    this.assertNoMergedCellsInSpreadZone(formulaPosition, formulaReturn);
    forEachSpreadPositionInMatrix(nbColumns, nbRows, this.checkCollision(formulaPosition));
    forEachSpreadPositionInMatrix(
      nbColumns,
      nbRows,
      // thanks to the isMatrix check above, we know that formulaReturn is MatrixFunctionReturn
      this.spreadValues(formulaPosition, formulaReturn)
    );
    this.invalidatePositionsDependingOnSpread(formulaPosition.sheetId, resultZone);
    return createEvaluatedCell(
      nullValueToZeroValue(formulaReturn[0][0]),
      this.getters.getLocale(),
      cellData
    );
  }

  private invalidatePositionsDependingOnSpread(sheetId: UID, resultZone: Zone) {
    // the result matrix is split in 2 zones to exclude the array formula position
    const invalidatedPositions = this.formulaDependencies().getCellsDependingOn(
      excludeTopLeft(resultZone).map((zone) => ({ sheetId, zone }))
    );
    invalidatedPositions.delete({ sheetId, col: resultZone.left, row: resultZone.top });
    this.nextPositionsToUpdate.addMany(invalidatedPositions);
  }

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<FunctionResultObject>
  ) {
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;

    if (enoughCols && enoughRows) {
      return;
    }

    if (enoughCols) {
      throw new SplillBlockedError(
        _t("Result couldn't be automatically expanded. Please insert more rows.")
      );
    }

    if (enoughRows) {
      throw new SplillBlockedError(
        _t("Result couldn't be automatically expanded. Please insert more columns.")
      );
    }

    throw new SplillBlockedError(
      _t("Result couldn't be automatically expanded. Please insert more columns and rows.")
    );
  }

  private assertNoMergedCellsInSpreadZone(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<FunctionResultObject>
  ) {
    const mergedCells = this.getters.getMergesInZone(sheetId, {
      top: row,
      bottom: row + matrixResult[0].length - 1,
      left: col,
      right: col + matrixResult.length - 1,
    });

    if (mergedCells.length === 0) {
      return;
    }

    throw new SplillBlockedError(
      _t("Merged cells found in the spill zone. Please unmerge cells before using array formulas.")
    );
  }

  private checkCollision(formulaPosition: CellPosition): (i: number, j: number) => void {
    const { sheetId, col, row } = formulaPosition;
    const checkCollision = (i: number, j: number) => {
      const position = { sheetId: sheetId, col: i + col, row: j + row };
      const rawCell = this.getters.getCell(position);
      if (
        rawCell?.content ||
        this.getters.getEvaluatedCell(position).type !== CellValueType.empty
      ) {
        this.blockedArrayFormulas.add(formulaPosition);
        throw new SplillBlockedError(
          _t(
            "Array result was not expanded because it would overwrite data in %s.",
            toXC(position.col, position.row)
          )
        );
      }
      this.blockedArrayFormulas.delete(formulaPosition);
    };
    return checkCollision;
  }

  private spreadValues(
    { sheetId, col, row }: CellPosition,
    matrixResult: Matrix<FunctionResultObject>
  ): (i: number, j: number) => void {
    const spreadValues = (i: number, j: number) => {
      const position = { sheetId, col: i + col, row: j + row };
      const cell = this.getters.getCell(position);
      const evaluatedCell = createEvaluatedCell(
        nullValueToZeroValue(matrixResult[i][j]),
        this.getters.getLocale(),
        cell
      );
      this.evaluatedCells.set(position, evaluatedCell);
    };
    return spreadValues;
  }

  private invalidateSpreading(position: CellPosition) {
    const zone = this.spreadingRelations.getArrayResultZone(position);
    if (!zone) {
      return;
    }
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const resultPosition = { sheetId: position.sheetId, col, row };
        const content = this.getters.getCell(resultPosition)?.content;
        if (content) {
          // there's no point at re-evaluating overlapping array formulas,
          // there's still a collision
          continue;
        }
        this.evaluatedCells.delete(resultPosition);
      }
    }
    const sheetId = position.sheetId;
    this.invalidatePositionsDependingOnSpread(sheetId, zone);
    this.nextPositionsToUpdate.addMany(this.getArrayFormulasBlockedBy(sheetId, zone));
  }

  /**
   * Wraps a GetSymbolValue function to add cycle detection
   * and error handling.
   */
  private buildSafeGetSymbolValue(getContextualSymbolValue?: GetSymbolValue): GetSymbolValue {
    const getSymbolValue = (symbolName: string) => {
      if (this.symbolsBeingComputed.has(symbolName)) {
        return ERROR_CYCLE_CELL;
      }
      this.symbolsBeingComputed.add(symbolName);
      try {
        const symbolValue = getContextualSymbolValue?.(symbolName);
        if (symbolValue) {
          return symbolValue;
        }
        return new BadExpressionError(_t("Invalid formula"));
      } finally {
        this.symbolsBeingComputed.delete(symbolName);
      }
    };
    return getSymbolValue;
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
    const zonesBySheetIds = aggregatePositionsToZones(positions);
    for (const sheetId in zonesBySheetIds) {
      ranges.push(...zonesBySheetIds[sheetId].map((zone) => ({ sheetId, zone })));
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
function nullValueToZeroValue(functionResult: FunctionResultObject): FunctionResultObject {
  if (functionResult.value === null || functionResult.value === undefined) {
    // 'functionResult.value === undefined' is supposed to never happen, it's a safety net for javascript use
    return { ...functionResult, value: 0 };
  }
  return functionResult;
}

export function updateEvalContextAndExecute(
  compiledFormula: RangeCompiledFormula,
  compilationParams: CompilationParameters,
  sheetId: UID,
  getSymbolValue: GetSymbolValue,
  originCellPosition: CellPosition | undefined
) {
  compilationParams.evalContext.__originCellPosition = originCellPosition;
  compilationParams.evalContext.__originSheetId = sheetId;
  return compiledFormula.execute(
    compiledFormula.dependencies,
    compilationParams.referenceDenormalizer,
    compilationParams.ensureRange,
    getSymbolValue,
    compilationParams.evalContext
  );
}
