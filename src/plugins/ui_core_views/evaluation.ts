import { compile } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../../helpers/cells";
import {
  intersection,
  isDefined,
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
  isMatrix,
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
  private readonly evalContext: EvalContext;

  constructor(config: UIPluginConfig) {
    super(config);
    this.evalContext = config.custom;
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
        this.evaluate();
        break;
    }
  }

  finalize() {
    if (!this.isUpToDate) {
      this.evaluate();
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
    return this.evaluatedCells[sheetId]?.[col]?.[row] || createEvaluatedCell("");
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
    return Object.values(this.evaluatedCells[sheetId]?.[col] || []).filter(isDefined);
  }

  getEvaluatedCellsInZone(sheetId: UID, zone: Zone): EvaluatedCell[] {
    return positions(zone).map(({ col, row }) =>
      this.getters.getEvaluatedCell({ sheetId, col, row })
    );
  }

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------

  private setEvaluatedCell({ sheetId, col, row }: CellPosition, evaluatedCell: EvaluatedCell) {
    if (!this.evaluatedCells[sheetId]) {
      this.evaluatedCells[sheetId] = {};
    }
    if (!this.evaluatedCells[sheetId]![col]) {
      this.evaluatedCells[sheetId]![col] = {};
    }
    this.evaluatedCells[sheetId]![col]![row] = evaluatedCell;
  }

  private *getAllCells(): Iterable<Cell> {
    // use a generator function to avoid re-building a new object
    // need to sort the cells by position
    /*/
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        yield cells[cellId];
      }
    }
    /*/
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      const cell_ids = Object.keys(cells).sort((id1, id2) => {
        const { col: col1, row: row1 } = this.getters.getCellPosition(id1);
        const { col: col2, row: row2 } = this.getters.getCellPosition(id2);
        return col1 < col2 || (col1 == col2 && row1 < row2) ? -1 : 1;
      });
      for (const cellId of cell_ids) {
        yield cells[Number(cellId)];
      }
    }
    /**/
  }

  private evaluate() {
    this.evaluatedCells = {};
    const cellsBeingComputed = new Set<UID>();
    const computeCell = ({ col, row, sheetId }: CellPosition): EvaluatedCell => {
      let evaluation = this.evaluatedCells[sheetId]?.[col]?.[row];
      if (evaluation) {
        return evaluation;
      }
      const cell = this.getters.getCell({ sheetId, col, row });
      if (!cell) {
        return createEvaluatedCell("");
      }
      try {
        switch (cell.isFormula) {
          case true:
            evaluation = computeFormulaCell(cell);
            break;
          case false:
            evaluation = evaluateLiteral(cell.content, cell.format);
            break;
        }
      } catch (e) {
        return handleError(e, cell);
      }
      this.setEvaluatedCell({ col, row, sheetId }, evaluation);
      return evaluation;
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
      const cellId = cellData.id;
      if (cellsBeingComputed.has(cellId)) {
        throw new CircularDependencyError();
      }
      compilationParameters[2].__originCellXC = () => {
        // compute the value lazily for performance reasons
        const position = compilationParameters[2].getters.getCellPosition(cellId);
        return toXC(position.col, position.row);
      };
      cellsBeingComputed.add(cellId);
      const computedCell = cellData.compiledFormula.execute(
        cellData.dependencies,
        ...compilationParameters
      );
      cellsBeingComputed.delete(cellId);

      if (isMatrix(computedCell.value)) {
        const { col, row, sheetId } = this.getters.getCellPosition(cellId);
        for (let i = 0; i < computedCell.value.length; ++i) {
          for (let j = 0; j < computedCell.value[i].length; ++j) {
            if (i == 0 && j == 0) {
              continue;
            }
            const rawCell = this.getters.getCell({ sheetId, col: col + i, row: row + j });
            if (
              rawCell?.content !== undefined ||
              this.evaluatedCells[sheetId]?.[col + i]?.[row + j] !== undefined
            ) {
              throw `Array result was not expanded because it would overwrite data in ${toXC(
                col + i,
                row + j
              )}.`;
            }
          }
        }
        for (let i = 0; i < computedCell.value.length; ++i) {
          for (let j = 0; j < computedCell.value[i].length; ++j) {
            const evaluatedCell = createEvaluatedCell(
              computedCell.value[i][j],
              cellData.format || computedCell.format
            );
            this.setEvaluatedCell({ col: i + col, row: j + row, sheetId }, evaluatedCell);
          }
        }
        return createEvaluatedCell(
          computedCell.value[0][0],
          cellData.format || computedCell.format
        );
      }
      return createEvaluatedCell(computedCell.value, cellData.format || computedCell.format);
    };

    const compilationParameters = this.getCompilationParameters((position) =>
      computeCell(position)
    );

    for (const cell of this.getAllCells()) {
      this.setEvaluatedCell(
        this.getters.getCellPosition(cell.id),
        computeCell(this.getters.getCellPosition(cell.id))
      );
    }
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    computeCell: (position: CellPosition) => EvaluatedCell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;

    function readCell(range: Range): PrimitiveArg {
      if (!getters.tryGetSheet(range.sheetId)) {
        throw new Error(_lt("Invalid sheet name"));
      }
      const {
        sheetId,
        zone: { left: col, top: row },
      } = range;
      const evaluatedCell = getEvaluatedCellIfNotEmpty({ sheetId, col, row });
      if (evaluatedCell === undefined) {
        return { value: null };
      }
      return evaluatedCell;
    }

    const getEvaluatedCellIfNotEmpty = (position: CellPosition): EvaluatedCell | undefined => {
      const evaluatedCell = getEvaluatedCell(position);
      if (evaluatedCell.type === CellValueType.empty) {
        const cell = getters.getCell(position);
        if (!cell || cell.content === "") {
          return undefined;
        }
      }
      return evaluatedCell;
    };

    const getEvaluatedCell = (position: CellPosition): EvaluatedCell => {
      const evaluatedCell = computeCell(position);
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
          rowValues.push(getEvaluatedCellIfNotEmpty({ sheetId: range.sheetId, col, row }));
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
