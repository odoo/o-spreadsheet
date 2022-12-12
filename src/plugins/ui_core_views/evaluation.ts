import { compile } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import {
  createEvaluatedCell,
  errorCell,
  evaluateLiteral,
} from "../../helpers/cells/cell_evaluation";
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
  HeaderIndex,
  invalidateEvaluationCommands,
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

type TypeByCellsPosition<T> = { [col: HeaderIndex]: { [row: HeaderIndex]: T } };
type TypeByCellsPositionBySheets<T> = { [sheetID: UID]: TypeByCellsPosition<T> };

function* positionOfCells<T>(
  typeByCellsPositionBySheets: TypeByCellsPositionBySheets<T>,
  sheetId: UID
): Iterable<CellPosition> {
  // use a generator function to avoid re-building a new object
  const typeByCellsPosition = typeByCellsPositionBySheets[sheetId];
  if (typeByCellsPosition) {
    for (let x of Object.keys(typeByCellsPosition).sort((a, b) => Number(a) - Number(b))) {
      for (let y of Object.keys(typeByCellsPosition[x]).sort((a, b) => Number(a) - Number(b))) {
        yield { sheetId, col: Number(x), row: Number(y) };
      }
    }
  }
}

function setObjectAtCellsPosition<T>(
  typeByCellsPositionBySheets: TypeByCellsPositionBySheets<T>,
  { sheetId, col, row }: CellPosition,
  type: T
) {
  if (!typeByCellsPositionBySheets[sheetId]) {
    typeByCellsPositionBySheets[sheetId] = {};
  }
  if (!typeByCellsPositionBySheets[sheetId]![col]) {
    typeByCellsPositionBySheets[sheetId]![col] = {};
  }
  typeByCellsPositionBySheets[sheetId]![col]![row] = type;
}

function removeObjectAtCellsPosition<T>(
  typeByCellsPositionBySheets: TypeByCellsPositionBySheets<T>,
  { sheetId, col, row }: CellPosition
) {
  if (typeByCellsPositionBySheets[sheetId]![col]![row] === undefined) {
    return;
  }

  delete typeByCellsPositionBySheets[sheetId][col][row];
  if (Object.keys(typeByCellsPositionBySheets[sheetId][col]).length === 0) {
    delete typeByCellsPositionBySheets[sheetId][col];
  }
  if (Object.keys(typeByCellsPositionBySheets[sheetId]).length === 0) {
    delete typeByCellsPositionBySheets[sheetId];
  }
}

function visitMatrix<T>(matrix: T[][], cb: (x: number, y: number) => void) {
  for (let x = 0; x < matrix.length; x++) {
    for (let y = 0; y < matrix[0].length; y++) {
      cb(x, y);
    }
  }
}

export class EvaluationPlugin extends UIPlugin {
  static getters = [
    "evaluateFormula",
    "getRangeFormattedValues",
    "getRangeValues",
    "getEvaluatedCell",
    "getEvaluatedCells",
    "getEvaluatedCellsInZone",
  ] as const;

  private isUpToDate = false;
  private cellsHavingContent: TypeByCellsPositionBySheets<Cell> = {};
  private spreadingAreasLimits: TypeByCellsPositionBySheets<CellPosition[]> = {};
  private evaluatedCells: TypeByCellsPositionBySheets<EvaluatedCell> = {};
  private cellsBeingComputed = new Set<UID>();
  private readonly evalContext: EvalContext;

  constructor(config: UIPluginConfig) {
    super(config);
    this.evalContext = config.external;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    if (invalidateEvaluationCommands.has(cmd.type)) {
      this.isUpToDate = false;
    }
    switch (cmd.type) {
      case "UPDATE_CELL":
        if ("content" in cmd || "format" in cmd) {
          this.isUpToDate = false;
        }
        break;
      case "EVALUATE_CELLS":
        this.initEvaluation();
        break;
    }
  }

  finalize() {
    if (!this.isUpToDate) {
      this.initEvaluation();
      this.isUpToDate = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formulaString: string, sheetId: UID = this.getters.getActiveSheetId()): any {
    const compiledFormula = compile(formulaString);
    const params = this.getCompilationParameters((cellPosition) =>
      this.getEvaluatedCell(cellPosition)
    );

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

  getEvaluatedCell({ sheetId, col, row }: CellPosition): EvaluatedCell {
    const evaluatedCell = this.evaluatedCells[sheetId]?.[col]?.[row];
    if (evaluatedCell) {
      return evaluatedCell; // already computed
    }

    const cell = this.cellsHavingContent[sheetId]?.[col]?.[row];
    if (cell && cell.content) {
      return this.computeEvaluatedCell(cell, { sheetId, col, row });
    }

    // An empty cell or a cell without content does not mean that the cell
    // should not have evaluated content. Indeed, formula functions can
    // return result arrays whose result is dispatched over several cells.
    // So we have to look for an empty cell if its evaluated content may
    // depend on previous cells.

    const evaluatedCellFromResultArray = this.computeEmptyCell({ sheetId, col, row });
    if (evaluatedCellFromResultArray) {
      return evaluatedCellFromResultArray;
    }

    // All cells in "evaluatedCells" exist either:
    // - because they have content that needs to be evaluated.
    // - because their evaluated content comes from a result array
    //
    // However a cell may have no content and have a format,
    // in this case we must return the format

    const rawCell = this.getters.getCell({ sheetId, col, row });
    return createEvaluatedCell("", rawCell?.format);
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

  getEvaluatedCellsInZone(sheetId: UID, zone: Zone): EvaluatedCell[] {
    return positions(zone).map(({ col, row }) =>
      this.getters.getEvaluatedCell({ sheetId, col, row })
    );
  }

  // ---------------------------------------------------------------------------
  // INIT EVALUATION
  // ---------------------------------------------------------------------------

  private initEvaluation() {
    this.evaluatedCells = {};
    this.cellsHavingContent = {};
    this.spreadingAreasLimits = {};
    this.cellsBeingComputed = new Set<UID>();

    this.fillCellsHavingContent();
    this.fillSpreadingAreasLimits();
  }

  private fillCellsHavingContent() {
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        const cellP = this.getters.getCellPosition(cellId);
        const cell = cells[cellId];
        if (cell.content) {
          setObjectAtCellsPosition(this.cellsHavingContent, cellP, cell);
        }
      }
    }
  }

  /**
   * Generates for each formula the area on which the formula can spread
   * to the maximum. This area is characterized by the position of the
   * other cells having a content and blocking the spreading.
   */
  private fillSpreadingAreasLimits() {
    /**
     * Example:
     *       |    A    |    B    |    C    |    D    |    E    |    F    |    G    |
     *   ___   _______   _______   _______   _______   _______   _______   _______
     *       |         |         |         |         |         |         |         |
     *    1  |         |         |         |         |         |         |         |
     *   ___   _______   _______   _______   _______   _______   _______   _______
     *       |         |         |         |         |         |         |         |
     *    2  |         | FORMULA |    S    |    S    |    S    |    S    |    S    |
     *   ___   _______   _______   _______   _______   _______   ► ► ► ► ► ► ► ► ► ►
     *       |         |         |         |         |         ▲         |         |
     *    3  | CNTNT A |    S    |    S    |    S    |    S    ▲ CNTNT F |         |
     *   ___   _______   _______   _______   _______   _______ ▲ _______   _______
     *       |         |         |         |         |         ▲         |         |
     *    4  |         |    S    |    S    |    S    |    S    ▲         | CNTNT G |
     *   ___   _______   _______   _______   _______   ► ► ► ►   _______   _______
     *       |         |         |         |         ▲         |         |         |
     *    5  |         |    S    |    S    |    S    ▲ CNTNT E |         |         |
     *   ___   _______   _______   ► ► ► ► ► ► ► ► ►   _______   _______   _______
     *       |         |         ▲         |         |         |         |         |
     *    6  |         |    S    ▲ CNTNT C |         |         |         |         |
     *   ___   _______   _______ ▲ _______   _______   _______   _______   _______
     *       |         |         ▲         |         |         |         |         |
     *    7  |         |    S    ▲         | CNTNT D |         |         |         |
     *   ___   _______   _______ ▲ _______   _______   _______   _______   _______
     *
     *
     * In the example above, FORMULA can spread a result only on the cells area represented by S.
     * Beyond this area, the distribution is blocked by cells having content.
     * Thus, we associate to Formula the coordinates of the cells with the content C, E and F
     * because they define the limits of the area.
     */

    for (const sheetId in this.cellsHavingContent) {
      for (const cellP of positionOfCells(this.cellsHavingContent, sheetId)) {
        const cell = this.cellsHavingContent[sheetId][cellP.col][cellP.row];
        if (cell.isFormula) {
          // TO DO: improve the performence here with a check on only formula that return array
          setObjectAtCellsPosition(
            this.spreadingAreasLimits,
            cellP,
            this.getSpreadingAreaLimits(cellP)
          );
        }
      }
    }
  }

  private getSpreadingAreaLimits(formulaP: CellPosition): CellPosition[] {
    const limits: CellPosition[] = [];
    let lastRowIndexLimit = Infinity;

    // note that positionOfCells is importent here because it gives position of cells having content in a ordering way
    // with that, we are sure that when we find a rowIndex, this is the index of the most highter element
    // TO DO: dont need to check cells on the rest of the column, make function that give index directly
    // generate a matrixIndex of cell having content and iterate on it

    // ex:  [ [1,[2,6,7,...]], [3,[1,5,9,...]], ......]

    for (const contentP of positionOfCells(this.cellsHavingContent, formulaP.sheetId)) {
      const isContentDifferentFromFormula = !(
        contentP.col === formulaP.col && contentP.row === formulaP.row
      );
      const isContentAfterFormula =
        contentP.col >= formulaP.col &&
        contentP.row >= formulaP.row &&
        isContentDifferentFromFormula;
      if (isContentAfterFormula) {
        if (contentP.row < lastRowIndexLimit) {
          lastRowIndexLimit = contentP.row;
          limits.push(contentP);
        }
      }
    }
    return limits;
  }

  // ---------------------------------------------------------------------------
  // EVALUATION
  // ---------------------------------------------------------------------------

  private computeEvaluatedCell(cell: Cell, cellP: CellPosition): EvaluatedCell {
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

    const computeFormulaCell = (cellData: FormulaCell): EvaluatedCell | EvaluatedCell[][] => {
      const cellId = cellData.id;
      if (this.cellsBeingComputed.has(cellId)) {
        throw new CircularDependencyError();
      }
      compilationParameters[2].__originCellXC = () => {
        // compute the value lazily for performance reasons
        const position = compilationParameters[2].getters.getCellPosition(cellId);
        return toXC(position.col, position.row);
      };
      this.cellsBeingComputed.add(cellId);
      const computedCell = cellData.compiledFormula.execute(
        cellData.dependencies,
        ...compilationParameters
      );
      this.cellsBeingComputed.delete(cellId);

      const { sheetId, col, row } = this.getters.getCellPosition(cellId);
      if (Array.isArray(computedCell.value)) {
        // Retur error if result size biger than the spreading area
        const colNbr = computedCell.value.length;
        const rowNbr = computedCell.value[0].length;
        const resultEndingPosition = {
          col: col + colNbr - 1,
          row: row + rowNbr - 1,
          sheetId,
        };
        const limits = this.spreadingAreasLimits[sheetId][col][row];
        const colision = this.getColision(resultEndingPosition, limits);
        if (colision) {
          throw new Error(
            _lt(
              `Array result was not expanded because it would overwrite data in ${toXC(
                colision.col,
                colision.row
              )}.`
            )
          );
        }

        // Return error if dependencies present ine the result zone
        // TO IMPROVE: return error if DEEP dependencies present in the result zone
        for (const range of cellData.dependencies) {
          if (
            intersection(range.zone, {
              left: col,
              top: row,
              right: resultEndingPosition.col,
              bottom: resultEndingPosition.row,
            })
          ) {
            throw new CircularDependencyError();
          }
        }
      }

      if (Array.isArray(computedCell.value)) {
        return computedCell.value.map((col) =>
          col.map((value) => createEvaluatedCell(value, cellData.format || computedCell.format))
        );
      }

      return createEvaluatedCell(computedCell.value, cellData.format || computedCell.format);
    };

    const compilationParameters = this.getCompilationParameters((cellPosition) =>
      this.getEvaluatedCell(cellPosition)
    );

    let result: EvaluatedCell | EvaluatedCell[][];
    try {
      switch (cell.isFormula) {
        case true:
          result = computeFormulaCell(cell);
          removeObjectAtCellsPosition(this.spreadingAreasLimits, cellP);
          break;
        case false:
          result = evaluateLiteral(cell.content, cell.format);
          break;
      }
    } catch (e) {
      result = handleError(e, cell);
    }
    this.setEvaluation(cellP, result);

    return Array.isArray(result) ? result[0][0] : result;
  }

  private computeEmptyCell(cellP: CellPosition): EvaluatedCell | undefined {
    for (const formulaP of positionOfCells(this.spreadingAreasLimits, cellP.sheetId)) {
      const formulaCell = this.cellsHavingContent[formulaP.sheetId][formulaP.col][formulaP.row];

      // TO DO: change cellsBeingComputed with cellPosition type
      const formulaIsBeingComputed = this.cellsBeingComputed.has(formulaCell.id);
      if (formulaIsBeingComputed) {
        continue;
      }

      const cellIsLocatedBeforFormula = cellP.col < formulaP.col || cellP.row < formulaP.row;
      if (cellIsLocatedBeforFormula) {
        continue;
      }

      const spreadingAreaLimits =
        this.spreadingAreasLimits[formulaP.sheetId][formulaP.col][formulaP.row];
      const cellIsInsideSpreadingArea = !this.getColision(cellP, spreadingAreaLimits);
      if (cellIsInsideSpreadingArea) {
        this.computeEvaluatedCell(formulaCell, formulaP);
        const evaluation = this.evaluatedCells[cellP.sheetId]?.[cellP.col]?.[cellP.row];
        if (evaluation) {
          return evaluation;
        }
      }
    }
    return undefined;
  }

  private getColision(cellP: CellPosition, limits: CellPosition[]): CellPosition | undefined {
    let colLimit = Infinity;
    let rowLimit = Infinity;

    for (const limitP of limits) {
      if (cellP.col < limitP.col && cellP.row >= rowLimit) {
        return {
          col: colLimit,
          row: rowLimit,
          sheetId: cellP.sheetId,
        };
      }
      colLimit = limitP.col;
      rowLimit = limitP.row;
    }

    if (cellP.col >= colLimit && cellP.row >= rowLimit) {
      return {
        col: colLimit,
        row: rowLimit,
        sheetId: cellP.sheetId,
      };
    }

    return undefined;
  }

  private setEvaluation(cellP: CellPosition, evaluation: EvaluatedCell | EvaluatedCell[][]) {
    const { sheetId, col, row } = cellP;
    if (Array.isArray(evaluation)) {
      const position = { sheetId, col, row };
      visitMatrix(evaluation, (x, y) => {
        position.col = col + x;
        position.row = row + y;
        setObjectAtCellsPosition(this.evaluatedCells, position, evaluation[x][y]);
      });
      this.updateAllSpreadingAreas({ sheetId, col, row }, position);
    } else {
      setObjectAtCellsPosition(this.evaluatedCells, { sheetId, col, row }, evaluation);
    }
  }

  /** update the spreading area for formulas that haven't been yet computed */
  private updateAllSpreadingAreas(startP: CellPosition, endP: CellPosition) {
    if (startP.sheetId !== endP.sheetId) {
      throw new Error("T'es un malade Bernard !");
    }

    const sheetId = startP.sheetId;

    for (const fP of positionOfCells(this.spreadingAreasLimits, sheetId)) {
      // The spreading result of a formula can only overwtrie the
      // spreading area of an other formula by the top or by the left.

      if (startP.col <= fP.col && startP.row <= fP.row) {
        // The spreading result can't come from a position located
        // before fP.col and beforefP.row at the same time. Because
        // in this case fP would have taken part of the limits of the
        // spread formula.
        continue;
      }

      if (startP.col > fP.col && startP.row > fP.row) {
        // The spreading result can't come from a position located
        // after fP.col and after fP.row at the same time. Because
        // in this case the spread formula is already part of the
        // limits of the fP formula.
        continue;
      }

      const oldLimits = this.spreadingAreasLimits[sheetId][fP.col][fP.row];

      const overWritenByTheLeft = fP.row < startP.row && fP.col <= endP.col;
      if (overWritenByTheLeft) {
        const newLimit = { sheetId, col: fP.col, row: startP.row };

        if (oldLimits.length === 0) {
          this.spreadingAreasLimits[sheetId][fP.col][fP.row] = [newLimit];
          return;
        }

        if (oldLimits[0].row >= newLimit.row) {
          const newLimits = [newLimit];
          for (const oldLimit of oldLimits) {
            if (oldLimit.row < newLimit.row) {
              newLimits.push(oldLimit);
            } else {
              break;
            }
          }
          this.spreadingAreasLimits[sheetId][fP.col][fP.row] = newLimits;
        }
        return;
      }

      const overWritenByTheTop = fP.col < startP.col && fP.row <= endP.row;
      if (overWritenByTheTop) {
        const newLimit = { sheetId, col: startP.col, row: fP.row };

        if (oldLimits.length === 0) {
          this.spreadingAreasLimits[sheetId][fP.col][fP.row] = [newLimit];
          return;
        }

        if (oldLimits[oldLimits.length - 1].col >= newLimit.col) {
          const newLimits: CellPosition[] = [];
          for (const oldLimit of oldLimits) {
            if (oldLimit.col < newLimit.col) {
              newLimits.push(oldLimit);
            }
          }
          newLimits.push(newLimit);
          this.spreadingAreasLimits[sheetId][fP.col][fP.row] = newLimits;
        }
        return;
      }
    }
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    getEvaluatedCell: (cellPosition: CellPosition) => EvaluatedCell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;

    function readCell(range: Range): PrimitiveArg {
      if (!getters.tryGetSheet(range.sheetId)) {
        // TO DO: look why not throw this error in the range function
        throw new Error(_lt("Invalid sheet name"));
      }
      const cellPosition = {
        sheetId: range.sheetId,
        col: range.zone.left,
        row: range.zone.top,
      };
      const evaluatedCell = getEvaluatedCell(cellPosition);
      if (evaluatedCell.type === CellValueType.error) {
        throw evaluatedCell.error;
      }

      const cell = getters.getCell(cellPosition);
      const cellIsRealyEmpty = !cell?.content && evaluatedCell.value === "";
      if (cellIsRealyEmpty) {
        return { value: null, format: evaluatedCell.format };
      }
      return evaluatedCell;
    }

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
      const result: MatrixArg = [];

      const zone = intersection(range.zone, sheetZone);
      if (!zone) {
        result.push([]);
        return result;
      }

      // Performance issue: nested loop is faster than a map here
      for (let col = zone.left; col <= zone.right; col++) {
        const rowValues: ({ value: CellValue; format?: Format } | undefined)[] = [];
        for (let row = zone.top; row <= zone.bottom; row++) {
          const evaluatedCell = getEvaluatedCell({ sheetId, col, row });
          if (evaluatedCell.type === CellValueType.error) {
            throw evaluatedCell.error;
          }
          // TODO: improve this condition
          const cell = getters.getCell({ sheetId, col, row });
          const cellIsRealyEmpty =
            (!cell || cell.content === undefined) && evaluatedCell.value === "";
          rowValues.push(cellIsRealyEmpty ? undefined : evaluatedCell);
        }
        result.push(rowValues);
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

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  exportForExcel(data: ExcelWorkbookData) {
    for (let sheet of data.sheets) {
      for (const xc in sheet.cells) {
        const position = { sheetId: sheet.id, ...toCartesian(xc) };
        const cell = this.getters.getCell(position);
        // TODO: export array result ?
        if (cell) {
          const exportedCellData = sheet.cells[xc]!;
          exportedCellData.value = this.getEvaluatedCell(position).value;
          exportedCellData.isFormula = cell.isFormula && !this.isBadExpression(cell.content);
        }
      }
    }
  }

  private isBadExpression(formula: string): boolean {
    try {
      compile(formula);
      return false;
    } catch (error) {
      return true;
    }
  }
}
