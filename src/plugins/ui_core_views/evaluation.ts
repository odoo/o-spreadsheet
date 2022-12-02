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

// function *getTypeByCellsPosition<T>( typeByCellsPosition: TypeByCellsPosition<T>): Iterable<T> {
//   // use a generator function to avoid re-building a new object
//   for(let x of Object.keys(typeByCellsPosition).sort()){
//     for(let y of Object.keys(typeByCellsPosition[x]).sort()){
//       yield typeByCellsPosition[x][y]
//     }
//   }
// }

// function *getTypeByCellsPositionBySheets<T>( typeByCellsPositionBySheets: TypeByCellsPositionBySheets<T>): Iterable<T> {
//   // use a generator function to avoid re-building a new object
//   for(let sheetId in typeByCellsPositionBySheets){
//     for(let type of getTypeByCellsPosition(typeByCellsPositionBySheets[sheetId])){
//       yield type;
//     }
//   }
// }

function* getCellsPositionFromSheet<T>(
  typeByCellsPositionBySheets: TypeByCellsPositionBySheets<T>,
  sheetId: UID
): Iterable<CellPosition> {
  // use a generator function to avoid re-building a new object
  const typeByCellsPosition = typeByCellsPositionBySheets[sheetId];
  for (let x of Object.keys(typeByCellsPosition).sort()) {
    for (let y of Object.keys(typeByCellsPosition[x]).sort()) {
      yield { sheetId, col: Number(x), row: Number(y) };
    }
  }
}

function setTypeInTypeByCellsPositionBySheets<T>(
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

    const cell = this.getters.getCell({sheetId, col, row});
    if (cell && cell.content) {
      return this.computeEvaluatedCell(cell);
    }

    // An empty cell or a cell without content does not mean that the cell
    // should not have evaluated content. Indeed, formula functions can
    // return result arrays whose result is dispatched over several cells.
    // So we have to look for an empty cell if its evaluated content may
    // depend on previous cells.

    for (const formulaPosition of getCellsPositionFromSheet(this.spreadingAreasLimits, sheetId)) {
      if ((col >= formulaPosition.col, row >= formulaPosition.row)) {
        const spreadingAreaLimits =
          this.spreadingAreasLimits[formulaPosition.sheetId][formulaPosition.col][
            formulaPosition.row
          ];

        if (this.isCellInsideSpreadingArea(col, row, formulaPosition, spreadingAreaLimits)) {
          const formulaCell =
            this.cellsHavingContent[formulaPosition.sheetId][formulaPosition.col][
              formulaPosition.row
            ];

          this.computeEvaluatedCell(formulaCell);
          const evaluation = this.evaluatedCells[sheetId]?.[col]?.[row];
          if (evaluation) {
            return evaluation;
          }
        }
      }
    }

    // const zonesByCellsPosition = this.spreadingAreasLimits[sheetId]
    // for(let x of Object.keys(zonesByCellsPosition).sort()){
    //   for(let y of Object.keys(zonesByCellsPosition).sort()){
    //     const _x = Number(x)
    //     const _y = Number(y)
    //     const zones = zonesByCellsPosition[_x][_y]
    //     if(zones.some((zone) => isInside(col, row, zone))){

    //       // TODO: change this line
    //       const formulaCell = this.getters.getCell(sheetId,_x,_y)!

    //       this.computeEvaluatedCell(formulaCell)
    //       const evaluation = this.evaluatedCells[sheetId]?.[col]?.[row];
    //       if (evaluation) {
    //         return evaluation
    //       }
    //     }
    //   }
    // }

    return createEvaluatedCell("");
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

    this.fillCellsHavingContent();
    this.fillSpreadingAreasLimits();
  }

  private fillCellsHavingContent() {
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        const cellPosition = this.getters.getCellPosition(cellId);
        const cell = cells[cellId];
        if (cell.content) {
          setTypeInTypeByCellsPositionBySheets(this.cellsHavingContent, cellPosition, cell);
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
      for (const cellPosition of getCellsPositionFromSheet(this.cellsHavingContent, sheetId)) {
        const cell = this.cellsHavingContent[sheetId][cellPosition.col][cellPosition.row];
        if (cell.isFormula) {
          // TO DO: improve the performence here with a check on only formula that return array
          setTypeInTypeByCellsPositionBySheets(
            this.spreadingAreasLimits,
            cellPosition,
            this.getSpreadingAreaLimits(cellPosition)
          );
        }
      }
    }
  }

  private getSpreadingAreaLimits(formulaPosition: CellPosition): CellPosition[] {
    const limits: CellPosition[] = [];
    let lastRowIndexLimit = Infinity;

    // note that getCellsPositionFromSheet is importent here because it gives position of cells having content in a ordering way
    // with that, we are sure that when we find a rowIndex, this is the index of the most highter element
    // TO DO: dont need to check cells on the rest of the column, make function that give dico of rowIdex[] by col
    // generate a matrixIndex of cell having content and iterate on it

    // ex:   [[1: [2,6,7]], ...

    for (const { sheetId, col, row } of getCellsPositionFromSheet(
      this.cellsHavingContent,
      formulaPosition.sheetId
    )) {
      if (col >= formulaPosition.col && row >= formulaPosition.row) {
        if (row < lastRowIndexLimit) {
          lastRowIndexLimit = row;
          limits.push({ sheetId, col, row });
        }
      }
    }
    return limits;
  }

  private isCellInsideSpreadingArea(
    col: HeaderIndex,
    row: HeaderIndex,
    formulaPosition: CellPosition,
    spreadingAreaLimits: CellPosition[]
  ): boolean {
    // if(col >= formulaPosition.col && row >= formulaPosition.row ){

    //   if()

    //   for( const limit of spreadingAreaLimits){
    //     if ()

    //   }
    // }
    return false;
  }

  // ---------------------------------------------------------------------------
  // EVALUATION
  // ---------------------------------------------------------------------------

  private computeEvaluatedCell(cell: Cell): EvaluatedCell {
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

      if (Array.isArray(computedCell.value)) {
        const { sheetId, col, row } = this.getters.getCellPosition(cellId);

        // retourner erreur si plus grand que la zone prevu
        // retourner erreur evaluated cell venant d'une autre result array present dans la zone
        visitMatrix(computedCell.value, (x, y) => {
          if (this.evaluatedCells[sheetId]![col + x]![row + y]) {
            throw new Error(_lt("Content en vue mon capitaine"));
          }
        });

        // TODO: return error if deep dependencies present in the result zone
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
          break;
        case false:
          result = evaluateLiteral(cell.content, cell.format);
          break;
      }
    } catch (e) {
      result = handleError(e, cell);
    }
    this.setEvaluation(cell.id, result);

    return Array.isArray(result) ? result[0][0] : result;
  }

  private setEvaluation(cellId: UID, evaluation: EvaluatedCell | EvaluatedCell[][]) {
    const { sheetId, col, row } = this.getters.getCellPosition(cellId);
    if (Array.isArray(evaluation)) {
      visitMatrix(evaluation, (x, y) => {
        const position = { sheetId, col: col + x, row: row + y };
        setTypeInTypeByCellsPositionBySheets(this.evaluatedCells, position, evaluation[x][y]);
      });

      // TODO: MAJ DE zonesWaitingForPotentialMatrixResults

      // this.updateSpreadingAreasLimits(position, )
    } else {
      setTypeInTypeByCellsPositionBySheets(this.evaluatedCells, { sheetId, col, row }, evaluation);
    }
  }

  // private updateSpreadingAreasLimits(){

  // }

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
        // TO DO: look why not throw this error in range
        throw new Error(_lt("Invalid sheet name"));
      }
      const evaluatedCell = getEvaluatedCell({
        sheetId: range.sheetId,
        col: range.zone.left,
        row: range.zone.top,
      });
      if (evaluatedCell.type === CellValueType.error) {
        throw evaluatedCell.error;
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
          rowValues.push(evaluatedCell);
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
