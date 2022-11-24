import { compile } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../../helpers/cells";
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
type cellsPosition = Record<UID, Record<HeaderIndex, HeaderIndex[]>>;
// { [sheetId: UID]: {[col: HeaderIndex]: {row: HeaderIndex } } }
export class EvaluationPlugin extends UIPlugin {
  static getters = [
    "evaluateFormula",
    "getRangeFormattedValues",
    "getRangeValues",
    "getEvaluatedCell",
    "getEvaluatedCells",
    "getColEvaluatedCells",
    "getEvaluatedCellsInZone",
  ] as const;

  private isUpToDate = false;
  private evaluatedCells: {
    [sheetId: UID]:
      | {
          [col: HeaderIndex]: { [row: HeaderIndex]: EvaluatedCell | undefined } | undefined;
        }
      | undefined;
  } = {};
  private potentialZonesThatCouldReceiveResultsFromFormulaArray;
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
    const params = this.getCompilationParameters((cell) =>
      this.getEvaluatedCell(this.getters.getCellPosition(cell.id))
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
    return this.getEvaluatedCellOrComputeIt({ sheetId, col, row });
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
  // Evaluator
  // ---------------------------------------------------------------------------

  private setEvaluation(cellId: UID, evaluatedCell: EvaluatedCell | EvaluatedCell[][]) {
    const { col, row, sheetId } = this.getters.getCellPosition(cellId);
    if (!this.evaluatedCells[sheetId]) {
      this.evaluatedCells[sheetId] = {};
    }
    if (!this.evaluatedCells[sheetId]![col]) {
      this.evaluatedCells[sheetId]![col] = {};
    }
    this.evaluatedCells[sheetId]![col]![row] = evaluatedCell;

    // on regarde si il est possible d'inclure l'array dans les zones correspondant à la cell
    // on regarde si aucune ref de la formule n'est present dans la zone qui s'apprete à être rempli
    // si oui --> remplir evaluatedCells et mettre à jours le dico des zones disponibles
  }

  private initEvaluation() {
    this.evaluatedCells = {};
    this.potentialZonesThatCouldReceiveResultsFromFormulaArray = "42"; //...
  }

  private getEvaluatedCellOrComputeIt({ sheetId, col, row }: CellPosition): EvaluatedCell {
    const evaluation = this.evaluatedCells[sheetId]?.[col]?.[row];

    if (evaluation) {
      return evaluation; // already computed
    }

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
        // if a value returns an array (like =A1:A3)
        throw new Error(_lt("This formula depends on invalid values"));
      }
      return createEvaluatedCell(computedCell.value, cellData.format || computedCell.format);
    };

    const compilationParameters = this.getCompilationParameters((cellPosition) =>
      this.getEvaluatedCellOrComputeIt(cellPosition)
    );

    const cell = this.getters.getCell(sheetId, col, row);
    if (cell && cell.content) {
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

      return result; // or result[0][0]
    }

    // An empty cell or a cell without content does not mean that the cell should not have evaluated content.
    // Indeed, formula functions can return result arrays whose result is dispatched over several cells.
    // So we have to look for an empty cell if its evaluated content may depend on previous cells.

    // while cellPosition in potentialZonesByFormulaThatRunturnArray:
    //   compute formula that runturn array ( à faire tant qu'il y a des formules dont les zones corespondent)
    //     --> remplir la liste
    //     --> mettre à jours le dic
    //     --> si result se trouve dans l'array, return le result

    // return createEvaluatedCell("")
  }

  private positionOfAllCellHavingContent(): cellsPosition {
    let orderedPosition: cellsPosition = {};

    for (const sheetId of this.getters.getSheetIds()) {
      orderedPosition[sheetId] = {};
      const cells = this.getters.getCells(sheetId);

      for (const cellId in cells) {
        const cell = cells[cellId];

        if (cell && cell.content) {
          const { col, row } = this.getters.getCellPosition(cellId);
          if (!orderedPosition[sheetId]) {
            orderedPosition[sheetId] = {};
          }
          if (!orderedPosition[sheetId][col]) {
            orderedPosition[sheetId][col] = [row];
          } else {
            orderedPosition[sheetId][col].push(row);
          }
        }
      }
    }
    return orderedPosition;
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    computeCellPosition: (cellPosition: CellPosition) => EvaluatedCell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;

    function readCell(range: Range): PrimitiveArg {
      let cell: Cell | undefined;
      if (!getters.tryGetSheet(range.sheetId)) {
        throw new Error(_lt("Invalid sheet name"));
      }
      cell = getters.getCell({ sheetId: range.sheetId, col: range.zone.left, row: range.zone.top });
      if (!cell || cell.content === "") {
        // magic "empty" value
        // Returning {value: null} instead of undefined will ensure that we don't
        // fall back on the default value of the argument provided to the formula's compute function
        return { value: null };
      }
      return getEvaluatedCell(cell);
    }

    const getEvaluatedCell = (cell: Cell): { value: CellValue; format?: Format } => {
      const evaluatedCell = computeCellPosition(cell);
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
          const cell = evalContext.getters.getCell({ sheetId: range.sheetId, col, row });
          rowValues.push(cell ? getEvaluatedCell(cell) : undefined);
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
