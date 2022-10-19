import { compile } from "../../formulas/index";
import { toNumber } from "../../functions/helpers";
import { functionRegistry } from "../../functions/index";
import { createEvaluationResult, errorEvaluation } from "../../helpers/cells";
import { linkDetector } from "../../helpers/cells/link_factory";
import {
  detectFormat,
  intersection,
  isBoolean,
  isDateTime,
  isDefined,
  isNumber,
  isZoneValid,
  positions,
  toCartesian,
  toXC,
  zoneToXc,
} from "../../helpers/index";
import { ModelConfig } from "../../model";
import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import { StateObserver } from "../../state_observer";
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
  CellValue,
  CellValueType,
  Command,
  CommandDispatcher,
  EnsureRange,
  EvalContext,
  EvaluationResult,
  ExcelWorkbookData,
  Format,
  FormattedValue,
  FormulaCellData,
  Getters,
  HeaderIndex,
  invalidateEvaluationCommands,
  Link,
  MatrixArg,
  PrimitiveArg,
  Range,
  ReferenceDenormalizer,
  StaticCellData,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

const functionMap = functionRegistry.mapping;

type CompilationParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];

export class EvaluationPlugin extends UIPlugin {
  static getters = [
    "evaluateFormula",
    "getRangeFormattedValues",
    "getRangeValues",
    "getCell",
    "getCells",
    "getColCells",
    "getCellsInZone",
  ] as const;

  private isUpToDate = false;
  private evaluatedCells: { [cellId: string]: Cell } = {};
  private readonly evalContext: EvalContext;
  private readonly detectLink = linkDetector(this.getters);

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig,
    selection: SelectionStreamProcessor
  ) {
    super(getters, state, dispatch, config, selection);
    this.evalContext = config.evalContext;
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
        this.isUpToDate = false;
        if ("content" in cmd || "format" in cmd) {
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
    const params = this.getCompilationParameters((cell) => this.evaluatedCells[cell.id]);

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
      .getCellsInZone(sheet.id, range.zone)
      .map((cell) => cell?.formattedValue || "");
  }

  /**
   * Return the value of each cell in the range.
   */
  getRangeValues(range: Range): (CellValue | undefined)[] {
    const sheet = this.getters.tryGetSheet(range.sheetId);
    if (sheet === undefined) return [];
    return this.getters.getCellsInZone(sheet.id, range.zone).map((cell) => cell?.evaluated.value);
  }

  getCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex): Cell | undefined {
    const sheet = this.getters.tryGetSheet(sheetId);
    const cellId = sheet?.rows[row]?.cells[col];
    if (cellId === undefined) {
      return undefined;
    }
    return this.evaluatedCells[cellId];
  }

  getCells(sheetId: UID): Record<UID, Cell> {
    const rawCells = this.getters.getCellsData(sheetId) || {};
    const record: Record<UID, Cell> = {};
    for (let cellId of Object.keys(rawCells)) {
      record[cellId] = this.evaluatedCells[cellId];
    }
    return record;
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(sheetId: UID, col: HeaderIndex): Cell[] {
    return this.getters
      .getSheet(sheetId)
      .rows.map((row) => row.cells[col])
      .filter(isDefined)
      .map((cellId) => this.evaluatedCells[cellId])
      .filter(isDefined);
  }

  getCellsInZone(sheetId: UID, zone: Zone): (Cell | undefined)[] {
    return positions(zone).map(({ col, row }) => this.getters.getCell(sheetId, col, row));
  }

  private createCell(staticData: StaticCellData, value: CellValue | null, format?: Format): Cell {
    const link = this.detectLink(value);
    if (link) {
      value = parseCellContent(link.label);
      format = format || detectFormat(link.label); // TODO add tests for this);
    }
    const evaluationResult = createEvaluationResult(value, format);
    return this.FUSION(staticData, evaluationResult, link);
  }

  // private setLoadingEvaluation(sheetId: UID, col: number, row: number) {
  //   const cellData = this.getters.getCellData(sheetId, col, row);
  //   if (cellData) {
  //     this.evaluatedCells[cellData.id] = this.FUSION(
  //       cellData,
  //       createEvaluationResult("Loading...")
  //     );
  //   }
  // }

  // Passage d'une cell solide à l'état liquide sous l'action de la chaleur.
  private FUSION(cellData: StaticCellData, evaluationResult: EvaluationResult, link?: Link): Cell {
    const cell = {
      id: cellData.id,
      content: cellData.content,
      format: cellData.format,
      style: cellData.style,
      link,
      isFormula: cellData.isFormula,
      isEmpty: () => evaluationResult.type === CellValueType.empty,
      composerContent: cellData.isFormula ? cellData.content : evaluationResult.composerContent,
      evaluated: evaluationResult,
      formattedValue: evaluationResult.formattedValue,
      isAutoSummable: evaluationResult.isAutoSummable,
      defaultAlign: evaluationResult.defaultAlign,
    };
    if (cellData.isValidFormula) {
      return {
        ...cell,
        isValidFormula: true,
        dependencies: cellData.dependencies,
        compiledFormula: cellData.compiledFormula,
      };
    } else {
      return {
        ...cell,
        isValidFormula: false,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------

  private *getAllCells(): Iterable<StaticCellData> {
    // use a generator function to avoid re-building a new object
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCellsData(sheetId);
      for (const cellId in cells) {
        yield cells[cellId];
      }
    }
  }
  private evaluate() {
    const visit: { [cellId: string]: "done" | "pending" } = {};
    const computeCell = (staticCell: StaticCellData): Cell => {
      const cellId = staticCell.id;
      if (visit[cellId] === "done" || this.evaluatedCells[cellId]) {
        return this.evaluatedCells[cellId]; // already computed
      }
      try {
        switch (staticCell.contentType) {
          case "invalidFormula":
            return handleError(staticCell.error, staticCell);
          case "validFormula":
            return computeFormulaCell(staticCell);
          case "constantValue":
            return this.createCell(
              staticCell,
              parseCellContent(staticCell.content),
              staticCell.format
            );
        }
      } catch (e) {
        return handleError(e, staticCell);
      }
    };

    const handleError = (e: Error | any, staticCell: StaticCellData): Cell => {
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
      return this.FUSION(staticCell, errorEvaluation(staticCell.content, error));
    };

    const computeFormulaCell = (cellData: FormulaCellData): Cell => {
      const cellId = cellData.id;
      if (visit[cellId] === "pending") {
        throw new CircularDependencyError();
      }
      compilationParameters[2].__originCellXC = () => {
        // compute the value lazily for performance reasons
        const position = compilationParameters[2].getters.getCellPosition(cellId);
        return toXC(position.col, position.row);
      };
      visit[cellId] = "pending";
      const computedCell = cellData.compiledFormula.execute(
        cellData.dependencies,
        ...compilationParameters
      );
      visit[cellId] = "done";
      if (Array.isArray(computedCell.value)) {
        // if a value returns an array (like =A1:A3)
        throw new Error(_lt("This formula depends on invalid values"));
      }
      return this.createCell(cellData, computedCell.value, cellData.format || computedCell.format);
    };

    const compilationParameters = this.getCompilationParameters(computeCell);
    this.evaluatedCells = {};
    for (const cell of this.getAllCells()) {
      this.evaluatedCells[cell.id] = computeCell(cell);
    }
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    computeCell: (cell: StaticCellData) => Cell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;

    function readCell(range: Range): PrimitiveArg {
      let cell: StaticCellData | undefined;
      if (!getters.tryGetSheet(range.sheetId)) {
        throw new Error(_lt("Invalid sheet name"));
      }
      cell = getters.getCellData(range.sheetId, range.zone.left, range.zone.top);
      if (!cell || cell.content === "") {
        // magic "empty" value
        // Returning {value: null} instead of undefined will ensure that we don't
        // fall back on the default value of the argument provided to the formula's compute function
        return { value: null };
      }
      return getEvaluatedCell(cell);
    }

    const getEvaluatedCell = (
      staticCell: StaticCellData
    ): { value: CellValue; format?: Format } => {
      const cell = computeCell(staticCell);
      this.evaluatedCells[staticCell.id] = cell;
      if (cell.evaluated.type === CellValueType.error) {
        throw new EvaluationError(
          cell.evaluated.value,
          cell.evaluated.error.message,
          cell.evaluated.error.logLevel
        );
      }
      return cell.evaluated;
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
          const cell = evalContext.getters.getCellData(range.sheetId, col, row);
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
        const { col, row } = toCartesian(xc);
        const cell = this.getters.getCell(sheet.id, col, row);
        if (cell) {
          const exportedCellData = sheet.cells[xc]!;
          exportedCellData.value = cell.evaluated.value;
          exportedCellData.isFormula = cell.isValidFormula;
        }
      }
    }
  }
}

function parseCellContent(content: string): CellValue {
  if (isNumber(content) || isDateTime(content)) {
    return toNumber(content);
  } else if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE" ? true : false;
  }
  return content;
}
