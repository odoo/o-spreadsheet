import { compile } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../../helpers/cells";
import { FormulaDependencyGraph, SpreadingRelation } from "../../helpers/evaluation";
import {
  intersection,
  isZoneValid,
  positions,
  toCartesian,
  toXC,
  zoneToXc,
} from "../../helpers/index";
import { _lt } from "../../translation";
import {
  CellErrorLevel,
  CellErrorType,
  CircularDependencyError,
  EvaluationError,
  InvalidReferenceError,
} from "../../types/errors";
import {
  Cell,
  CellPosition,
  CellValue,
  CellValueType,
  Command,
  EnsureRange,
  EvalContext,
  EvaluatedCell,
  ExcelWorkbookData,
  Format,
  FormattedValue,
  FormulaCell,
  FormulaReturn,
  HeaderIndex,
  invalidateDependenciesCommands,
  isMatrix,
  Matrix,
  MatrixArg,
  PrimitiveArg,
  Range,
  ReferenceDenormalizer,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

const functionMap = functionRegistry.mapping;

type CompilationParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];

type PositionDict<T> = { [rc: string]: T };

export class EvaluationPlugin extends UIPlugin {
  static getters = [
    "evaluateFormula",
    "getRangeFormattedValues",
    "getRangeValues",
    "getRangeFormats",
    "getEvaluatedCell",
    "getEvaluatedCells",
    "getColEvaluatedCells",
    "getEvaluatedCellsInZone",
  ] as const;

  private shouldRebuildDependenciesGraph = true;
  private shouldRecomputeCellsEvaluation = true;
  private readonly evalContext: EvalContext;

  private evaluatedCells: PositionDict<EvaluatedCell> = {};
  private rcsToUpdate = new Set<string>();

  private formulaDependencies = new FormulaDependencyGraph();
  private spreadingArraysFormulas = new Set<string>();
  private spreadingRelations = new SpreadingRelation();

  private maxIteration = 100;

  constructor(config: UIPluginConfig) {
    super(config);
    this.evalContext = config.custom;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    if (invalidateDependenciesCommands.has(cmd.type)) {
      this.shouldRebuildDependenciesGraph = true;
      this.shouldRecomputeCellsEvaluation = true;
      return;
    }
    switch (cmd.type) {
      case "UPDATE_CELL":
        if (!("content" in cmd || "format" in cmd)) {
          return;
        }

        const targetedRc = cellPositionToRc(cmd);
        this.rcsToUpdate.add(targetedRc);

        if ("content" in cmd) {
          // if the content change, formula dependencies may change. So we need to
          // update the formula dependencies graph.
          this.updateFormulaDependencies(targetedRc, false);
        }
        break;
      case "EVALUATE_CELLS":
        this.shouldRecomputeCellsEvaluation = true;
        break;
    }
  }

  finalize() {
    if (this.shouldRecomputeCellsEvaluation) {
      this.evaluatedCells = {};
      this.rcsToUpdate = new Set(this.getAllCells());
      if (this.shouldRebuildDependenciesGraph) {
        this.formulaDependencies = new FormulaDependencyGraph();
        this.spreadingArraysFormulas = new Set<string>();
        this.spreadingRelations = new SpreadingRelation();
        for (const rc of this.rcsToUpdate) {
          this.updateFormulaDependencies(rc, true);
        }
        this.shouldRebuildDependenciesGraph = false;
      }
      this.shouldRecomputeCellsEvaluation = false;
    } else if (this.rcsToUpdate.size) {
      const rcsToUpdateBis = new Set<string>();

      for (const rcToUpdate of this.rcsToUpdate) {
        extendSet(rcsToUpdateBis, this.findCellsToCompute(rcToUpdate, false));

        const content = this.rcToCell(rcToUpdate)?.content;
        // if the content of a cell changes, we need to check:
        if (content) {
          // 1) if we write in an empty cell containing the spread of a formula.
          //    In this case, it is necessary to indicate to recalculate the concerned
          //    formula to take into account the new collisions.
          for (const arrayFormula of this.spreadingRelations.getArrayFormulasRc(rcToUpdate)) {
            if (this.spreadingArraysFormulas.has(arrayFormula)) {
              extendSet(rcsToUpdateBis, this.findCellsToCompute(arrayFormula, true));
              break;
            }
          }
        } else if (this.spreadingRelations.hasResult(rcToUpdate)) {
          // 2) if we put an empty content on a cell which blocks the spread
          //    of another formula.
          //    In this case, it is necessary to indicate to recalculate formulas
          //    that was blocked by the old content.
          for (const arrayFormula of this.spreadingRelations.getArrayFormulasRc(rcToUpdate)) {
            extendSet(rcsToUpdateBis, this.findCellsToCompute(arrayFormula, true));
          }
        }
      }
      extendSet(this.rcsToUpdate, rcsToUpdateBis);
    }
    if (this.rcsToUpdate.size) {
      this.evaluate();
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formulaString: string, sheetId: UID = this.getters.getActiveSheetId()): any {
    const compiledFormula = compile(formulaString);
    const params = this.getCompilationParameters((cell) => this.getEvaluatedCellFromRc(cell));

    const ranges: Range[] = [];
    for (let xc of compiledFormula.dependencies) {
      ranges.push(this.getters.getRangeFromSheetXC(sheetId, xc));
    }
    return compiledFormula.execute(ranges, ...params).value;
  }

  /**
   * Return the value of each cell in the range as they are displayed in the grid.
   */
  getRangeFormattedValues(range: Range): FormattedValue[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters
      .getEvaluatedCellsInZone(sheet.id, range.zone)
      .map((cell) => cell.formattedValue);
  }

  /**
   * Return the value of each cell in the range.
   */
  getRangeValues(range: Range): CellValue[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters.getEvaluatedCellsInZone(sheet.id, range.zone).map((cell) => cell.value);
  }

  /**
   * Return the format of each cell in the range.
   */
  getRangeFormats(range: Range): (Format | undefined)[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters.getEvaluatedCellsInZone(sheet.id, range.zone).map((cell) => cell.format);
  }

  getEvaluatedCell(cellPosition: CellPosition): EvaluatedCell {
    return this.getEvaluatedCellFromRc(cellPositionToRc(cellPosition));
  }

  getEvaluatedCellFromRc(rc: string): EvaluatedCell {
    return this.evaluatedCells[rc] || createEvaluatedCell("");
  }

  getEvaluatedCells(sheetId: UID): Record<UID, EvaluatedCell> {
    const rawCells = this.getters.getCells(sheetId) || {};
    const record: Record<UID, EvaluatedCell> = {};
    for (let cellId of Object.keys(rawCells)) {
      const position = this.getters.getCellPosition(cellId);
      record[cellId] = this.getEvaluatedCell(position);
    }
    return record;
  }

  /**
   * Returns all the evaluated cells of a col
   */
  getColEvaluatedCells(sheetId: UID, col: HeaderIndex): EvaluatedCell[] {
    return Object.keys(this.evaluatedCells)
      .filter((rc) => {
        const position = this.getters.getCellPosition(this.rcToCell(rc)!.id);
        return position.sheetId === sheetId && position.col === col;
      })
      .map((rc) => this.evaluatedCells[rc]);
  }

  getEvaluatedCellsInZone(sheetId: UID, zone: Zone): EvaluatedCell[] {
    return positions(zone).map(({ col, row }) =>
      this.getters.getEvaluatedCell({ sheetId, col, row })
    );
  }

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------
  private updateFormulaDependencies(thisRc: string, graphCreation: boolean) {
    const cell = this.rcToCell(thisRc);
    const newDependencies: string[] = [];
    if (cell !== undefined && cell.isFormula) {
      for (const range of cell.dependencies) {
        if (range.invalidSheetName !== undefined || range.invalidXc !== undefined) {
          continue;
        }
        const sheetId = range.sheetId;
        for (const { col, row } of positions(range.zone)) {
          newDependencies.push(cellPositionToRc({ sheetId, col, row }));
        }
      }
    }

    /**
     * If we are not creating the graph, we need to remove the old dependencies
     * from the graph. But if we are creating the graph, we don't need to do it
     * because we are creating the graph from scratch. Not doing it increase
     * notably the performance of the graph creation.
     */
    if (!graphCreation) {
      this.formulaDependencies.removeAllDependencies(thisRc);
    }

    for (const dependency of newDependencies) {
      this.formulaDependencies.addDependency({ parameterRc: dependency, formulaRc: thisRc });
    }
  }

  private *getAllCells(): Iterable<string> {
    // use a generator function to avoid re-building a new object
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        yield cellPositionToRc(this.getters.getCellPosition(cellId));
      }
    }
  }

  private evaluate() {
    const cellsBeingComputed = new Set<UID>();
    const currentRcsToUpdate = new Set<string>();
    const nextRcsToUpdate = new Set<string>();

    const setEvaluatedCell = (rc: string, evaluatedCell: EvaluatedCell) => {
      if (nextRcsToUpdate.has(rc)) {
        nextRcsToUpdate.delete(rc);
      }
      if (currentRcsToUpdate.has(rc)) {
        currentRcsToUpdate.delete(rc);
      }
      this.evaluatedCells[rc] = evaluatedCell;
    };

    const computeCell = (rc: string): EvaluatedCell => {
      if (!currentRcsToUpdate.has(rc)) {
        const evaluation = this.evaluatedCells[rc];
        if (evaluation) {
          return evaluation; // already computed
        }
      }

      if (this.spreadingArraysFormulas.has(rc)) {
        for (const child of this.spreadingRelations.getArrayResultsRc(rc)) {
          delete this.evaluatedCells[child];
          extendSet(nextRcsToUpdate, this.findCellsToCompute(child, false));
          for (const candidate of this.spreadingRelations.getArrayFormulasRc(child)) {
            extendSet(nextRcsToUpdate, this.findCellsToCompute(candidate, true));
          }
        }
        this.spreadingArraysFormulas.delete(rc);
      }
      this.spreadingRelations.removeNode(rc);

      const cell = this.rcToCell(rc);
      if (cell === undefined) {
        return createEvaluatedCell("");
      }

      const cellId = cell.id;
      let result: EvaluatedCell;

      try {
        if (cellsBeingComputed.has(cellId)) {
          throw new CircularDependencyError();
        }
        cellsBeingComputed.add(cellId);
        switch (cell.isFormula) {
          case true:
            result = computeFormulaCell(cell);
            break;
          case false:
            result = evaluateLiteral(cell.content, cell.format);
            break;
        }
      } catch (e) {
        result = handleError(e, cell);
      }
      cellsBeingComputed.delete(cellId);

      return result;
    };

    const handleError = (e: Error | any, cell: Cell): EvaluatedCell => {
      if (!(e instanceof Error)) {
        e = new Error(e);
      }
      const msg = e?.errorType || CellErrorType.GenericError;
      // apply function name
      const __lastFnCalled = compilationParameters[2].__lastFnCalled || "";
      const error = new EvaluationError(
        msg,
        e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled),
        e.logLevel !== undefined ? e.logLevel : CellErrorLevel.error
      );
      return errorCell(cell.content, error);
    };

    const computeFormulaCell = (cellData: FormulaCell): EvaluatedCell => {
      const updatePotentialSpreaders = (i: number, j: number) => {
        const position = { sheetId, col: i + col, row: j + row };
        const rc = cellPositionToRc(position);
        this.spreadingRelations.addRelation({ resultRc: rc, arrayFormulaRc: parentRc });
      };

      const checkCollision = (i: number, j: number) => {
        const rawCell = this.getters.getCell({ sheetId, col: col + i, row: row + j });
        if (
          rawCell?.content ||
          this.getEvaluatedCell({ sheetId, col: col + i, row: row + j }).type !==
            CellValueType.empty
        ) {
          throw new Error(
            _lt(
              `Array result was not expanded because it would overwrite data in ${toXC(
                col + i,
                row + j
              )}.`
            )
          );
        }
      };

      const spreadValues = (i: number, j: number) => {
        const position = { sheetId, col: i + col, row: j + row };
        const cell = this.getters.getCell(position);
        const format = cell?.format;
        const evaluatedCell = createEvaluatedCell(
          computedValue![i][j],
          format || formatFromPosition(i, j)
        );

        const rc = cellPositionToRc(position);

        // update evaluatedCells
        setEvaluatedCell(rc, evaluatedCell);
        this.spreadingArraysFormulas.add(parentRc);

        // check if formula dependencies present in the spread zone
        // if so, they need to be recomputed
        extendSet(nextRcsToUpdate, this.findCellsToCompute(rc, false));
      };

      const cellId = cellData.id;
      compilationParameters[2].__originCellXC = () => {
        // compute the value lazily for performance reasons
        const position = compilationParameters[2].getters.getCellPosition(cellId);
        return toXC(position.col, position.row);
      };
      const formulaReturn = cellData.compiledFormula.execute(
        cellData.dependencies,
        ...compilationParameters
      );

      assertFormulaReturnHasConsistentDimensions(formulaReturn);

      const { value: computedValue, format: computedFormat } = formulaReturn;

      if (!isMatrix(computedValue)) {
        return createEvaluatedCell(
          computedValue,
          cellData.format || (computedFormat as string | undefined)
        ); // the case computedFormat as Matrix is handled by the assertFormulaReturnHasCoincidentDimensions
      }

      // next constants are used in the functions updatePotentialSpreaders/checkCollision/spreadValues
      const { sheetId, col, row } = this.getters.getCellPosition(cellId);
      const parentRc = cellPositionToRc({ sheetId, col, row });
      const formatFromPosition = isMatrix(computedFormat)
        ? (i: number, j: number) => computedFormat[i][j]
        : () => computedFormat;

      this.assertSheetHasEnoughSpaceToSpreadFormulaResult({ sheetId, col, row }, computedValue);

      forEachSpreadPositionInMatrix(computedValue, updatePotentialSpreaders);
      forEachSpreadPositionInMatrix(computedValue, checkCollision);
      forEachSpreadPositionInMatrix(computedValue, spreadValues);
      return createEvaluatedCell(computedValue[0][0], cellData.format || formatFromPosition(0, 0));
    };

    const compilationParameters = this.getCompilationParameters(computeCell);
    extendSet(nextRcsToUpdate, this.rcsToUpdate);
    this.rcsToUpdate.clear();

    let currentCycle = 0;
    while (nextRcsToUpdate.size && currentCycle < this.maxIteration) {
      extendSet(currentRcsToUpdate, nextRcsToUpdate);
      nextRcsToUpdate.clear();
      while (currentRcsToUpdate.size) {
        const [cell] = currentRcsToUpdate;
        setEvaluatedCell(cell, computeCell(cell));
      }
      ++currentCycle;
    }
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    computeCell: (rc: string) => EvaluatedCell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;

    function readCell(range: Range): PrimitiveArg {
      if (!getters.tryGetSheet(range.sheetId)) {
        throw new Error(_lt("Invalid sheet name"));
      }
      const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
      const evaluatedCell = getEvaluatedCellIfNotEmpty(position);
      if (evaluatedCell === undefined) {
        return { value: null };
      }
      return evaluatedCell;
    }

    const getEvaluatedCellIfNotEmpty = (position: CellPosition): EvaluatedCell | undefined => {
      const rc = cellPositionToRc(position);
      const evaluatedCell = getEvaluatedCell(rc);
      if (evaluatedCell.type === CellValueType.empty) {
        const cell = getters.getCell(position);
        if (!cell || cell.content === "") {
          return undefined;
        }
      }
      return evaluatedCell;
    };

    const getEvaluatedCell = (rc: string): EvaluatedCell => {
      const evaluatedCell = computeCell(rc);
      if (evaluatedCell.type === CellValueType.error) {
        throw evaluatedCell.error;
      }
      return evaluatedCell;
    };

    /**
     * Return the values of the cell(s) used in reference, but always in the format of a range even
     * if a single cell is referenced. It is a list of col values. This is useful for the formulas that describe parameters as
     * range<number> etc.
     *
     * Note that each col is possibly sparse: it only contain the values of cells
     * that are actually present in the grid.
     */
    function range(range: Range): MatrixArg {
      const sheetId = range.sheetId;

      if (!isZoneValid(range.zone)) {
        throw new InvalidReferenceError();
      }

      // Performance issue: Avoid fetching data on positions that are out of the spreadsheet
      // e.g. A1:ZZZ9999 in a sheet with 10 cols and 10 rows should ignore everything past J10 and return a 10x10 array
      const sheetZone = getters.getSheetZone(sheetId);
      const result: MatrixArg = { value: [], format: [] };

      const zone = intersection(range.zone, sheetZone);
      if (!zone) {
        result.value.push([]);
        result.format?.push([]);
        return result;
      }

      // Performance issue: nested loop is faster than a map here
      for (let col = zone.left; col <= zone.right; col++) {
        const rowValues: (CellValue | undefined)[] = [];
        const rowFormat: (Format | undefined)[] = [];
        for (let row = zone.top; row <= zone.bottom; row++) {
          const position = { sheetId: range.sheetId, col, row };
          const evaluatedCell = getEvaluatedCellIfNotEmpty(position);
          rowValues.push(evaluatedCell?.value);
          rowFormat.push(evaluatedCell?.format);
        }
        result.value.push(rowValues);
        result.format?.push(rowFormat);
      }
      return result;
    }

    /**
     * Returns the value of the cell(s) used in reference
     *
     * @param range the references used
     * @param isMeta if a reference is supposed to be used in a `meta` parameter as described in the
     *        function for which this parameter is used, we just return the string of the parameter.
     *        The `compute` of the formula's function must process it completely
     */
    function refFn(
      range: Range,
      isMeta: boolean,
      functionName: string,
      paramNumber?: number
    ): PrimitiveArg {
      if (isMeta) {
        // Use zoneToXc of zone instead of getRangeString to avoid sending unbounded ranges
        return { value: zoneToXc(range.zone) };
      }

      if (!isZoneValid(range.zone)) {
        throw new InvalidReferenceError();
      }

      // if the formula definition could have accepted a range, we would pass through the _range function and not here
      if (range.zone.bottom !== range.zone.top || range.zone.left !== range.zone.right) {
        throw new Error(
          paramNumber
            ? _lt(
                "Function %s expects the parameter %s to be a single value or a single cell reference, not a range.",
                functionName.toString(),
                paramNumber.toString()
              )
            : _lt(
                "Function %s expects its parameters to be single values or single cell references, not ranges.",
                functionName.toString()
              )
        );
      }

      if (range.invalidSheetName) {
        throw new Error(_lt("Invalid sheet name: %s", range.invalidSheetName));
      }

      return readCell(range);
    }
    return [refFn, range, evalContext];
  }

  private findCellsToCompute(mainRc: string, selfInclude: boolean = true): Iterable<string> {
    const cellsToCompute = new Set<string>();
    if (selfInclude) {
      cellsToCompute.add(mainRc);
    }
    this.formulaDependencies.visitDeepReferences(mainRc, (rc: string) => cellsToCompute.add(rc));
    return cellsToCompute;
  }

  private rcToCell(rc: string): Cell | undefined {
    return this.getters.getCell(rcToCellPosition(rc));
  }

  private assertSheetHasEnoughSpaceToSpreadFormulaResult(
    cellPosition: CellPosition,
    matrixResult: Matrix<CellValue>
  ) {
    const { sheetId, col, row } = cellPosition;
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const enoughCols = col + matrixResult.length <= numberOfCols;
    const enoughRows = row + matrixResult[0].length <= numberOfRows;
    if (!enoughCols || !enoughRows) {
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
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  exportForExcel(data: ExcelWorkbookData) {
    for (let sheet of data.sheets) {
      for (const rc in sheet.cells) {
        const position = { sheetId: sheet.id, ...toCartesian(rc) };
        const cell = this.getters.getCell(position);
        if (cell) {
          const exportedCellData = sheet.cells[rc]!;
          exportedCellData.value = this.getEvaluatedCell(position).value;
          exportedCellData.isFormula = cell.isFormula && !isBadExpression(cell.content);
        }
      }
    }
  }
}

function cellPositionToRc(position: CellPosition): string {
  return `${position.sheetId}!${position.col}!${position.row}`;
}

function rcToCellPosition(rc: string): CellPosition {
  const [sheetId, col, row] = rc.split("!");
  return { sheetId, col: Number(col), row: Number(row) };
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

function isBadExpression(formula: string): boolean {
  try {
    compile(formula);
    return false;
  } catch (error) {
    return true;
  }
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

function extendSet<T>(destination: Set<T>, source: Iterable<T>) {
  for (const element of source) {
    destination.add(element);
  }
}
