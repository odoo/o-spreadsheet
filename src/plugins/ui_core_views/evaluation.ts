import { compile } from "../../formulas/index";
import { toNumber } from "../../functions/helpers";
import { functionRegistry } from "../../functions/index";
import { createEvaluatedCell, errorCell, evaluateLiteral } from "../../helpers/cells";
import { BiDirectionalGraph, Graph } from "../../helpers/graph";
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
  invalidateDependenciesEvaluationCommands,
  isMatrix,
  MatrixArg,
  MatrixValue,
  PrimitiveArg,
  Range,
  ReferenceDenormalizer,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

const functionMap = functionRegistry.mapping;

type CompilationParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];

type PositionDict<T> = { [xc: string]: T };

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
  private nextXcsToUpdate: Set<string> = new Set<string>();
  private currentXcsToUpdate: Set<string> = new Set<string>();

  private formulaDependencies = new Graph();
  private spreadDependencies = new Graph();
  private spreadCandidates = new BiDirectionalGraph();

  private maxCycle = 100;

  constructor(config: UIPluginConfig) {
    super(config);
    this.evalContext = config.custom;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    if (invalidateDependenciesEvaluationCommands.has(cmd.type)) {
      this.shouldRecomputeCellsEvaluation = true;
      this.shouldRebuildDependenciesGraph = true;
    }
    switch (cmd.type) {
      case "UPDATE_CELL":
        if ("content" in cmd || "format" in cmd) {
          const position = { sheetId: cmd.sheetId, col: cmd.col, row: cmd.row };
          const targetedXC = this.cellPositionToXc(position);
          this.updateFormulaDependencies(targetedXC, false);
          this.findCellsToCompute(targetedXC, true);

          // in case we write on a spread dependency :
          //   we need to update the formula corresponding to the spread
          // in case we remove a cell :
          //   we need to update the spreadCandidates
          let shouldRecomputeSpreadCandidates: boolean = false;
          if (cmd.content !== undefined && cmd.content !== "") {
            for (const candidate of this.spreadCandidates.getTopDownAdjacentNodes(targetedXC)) {
              if (this.spreadDependencies.hasRelationBetween(candidate.xc, targetedXC)) {
                shouldRecomputeSpreadCandidates = true;
                break;
              }
            }
          } else {
            shouldRecomputeSpreadCandidates = this.spreadCandidates.hasTopDownNode(targetedXC);
          }

          if (shouldRecomputeSpreadCandidates) {
            for (const candidate of this.spreadCandidates.getTopDownAdjacentNodes(targetedXC)) {
              this.findCellsToCompute(candidate.xc, true);
            }
          }
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
      this.nextXcsToUpdate = new Set(
        Array.from(this.getAllCells()).map((c) =>
          this.cellPositionToXc(this.getters.getCellPosition(c.id))
        )
      );
      if (this.shouldRebuildDependenciesGraph) {
        this.formulaDependencies = new Graph();
        this.spreadDependencies = new Graph();
        for (const xc of this.nextXcsToUpdate) {
          this.updateFormulaDependencies(xc, true);
        }
        this.shouldRebuildDependenciesGraph = false;
      }
      this.shouldRecomputeCellsEvaluation = false;
    }
    this.evaluate();
    this.nextXcsToUpdate.clear();
  }

  private findCellsToCompute(mainXC: string, selfInclude: boolean = true) {
    if (selfInclude) {
      this.nextXcsToUpdate.add(mainXC);
    }
    this.formulaDependencies.depthFirstSearch(mainXC, (xc: string) => this.nextXcsToUpdate.add(xc));
  }

  private cellPositionToXc(position: CellPosition): string {
    return `${position.sheetId}!${position.col}!${position.row}`;
  }

  private XcToCell(xc: string): Cell | undefined {
    const [sheetId, col, row] = xc.split("!");
    return this.getters.getCell({ sheetId, col: toNumber(col), row: toNumber(row) });
  }

  private setEvaluatedCell(xc: string, evaluatedCell: EvaluatedCell) {
    if (this.nextXcsToUpdate.has(xc)) {
      this.nextXcsToUpdate.delete(xc);
    }
    if (this.currentXcsToUpdate.has(xc)) {
      this.currentXcsToUpdate.delete(xc);
    }
    this.evaluatedCells[xc] = evaluatedCell;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formulaString: string, sheetId: UID = this.getters.getActiveSheetId()): any {
    const compiledFormula = compile(formulaString);
    const params = this.getCompilationParameters((cell) => this.getEvaluatedCellFromXC(cell));

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
    return this.getEvaluatedCellFromXC(this.cellPositionToXc(cellPosition));
  }

  getEvaluatedCellFromXC(xc: string): EvaluatedCell {
    return this.evaluatedCells[xc] || createEvaluatedCell("");
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
      .filter((xc) => {
        const position = this.getters.getCellPosition(this.XcToCell(xc)!.id);
        return position.sheetId === sheetId && position.col === col;
      })
      .map((xc) => this.evaluatedCells[xc]);
  }

  getEvaluatedCellsInZone(sheetId: UID, zone: Zone): EvaluatedCell[] {
    return positions(zone).map(({ col, row }) =>
      this.getters.getEvaluatedCell({ sheetId, col, row })
    );
  }

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------
  private updateFormulaDependencies = (thisXC: string, graphCreation: boolean) => {
    const cell = this.XcToCell(thisXC);
    const newDependencies: string[] = [];
    if (cell !== undefined && cell.isFormula) {
      for (const range of cell.dependencies) {
        if (range.invalidSheetName !== undefined || range.invalidXc !== undefined) {
          continue;
        }
        const sheetId = range.sheetId;
        for (let col = range.zone.left; col <= range.zone.right; ++col) {
          for (let row = range.zone.top; row <= range.zone.bottom; ++row) {
            newDependencies.push(this.cellPositionToXc({ sheetId, col, row }));
          }
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
      for (const dependency of this.formulaDependencies.nodes.keys()) {
        if (!newDependencies.includes(dependency)) {
          this.formulaDependencies.removeEdge(dependency, thisXC);
        }
      }
    }

    for (const dependency of newDependencies) {
      this.formulaDependencies.addEdge(dependency, thisXC);
    }
  };

  private updateCellsToRecomputeAndRemoveRelatedSpreading() {
    this.currentXcsToUpdate = new Set([...this.currentXcsToUpdate, ...this.nextXcsToUpdate]);
    for (const xc of this.currentXcsToUpdate) {
      for (const child of this.spreadCandidates.getBottomUpAdjacentNodes(xc)) {
        this.spreadCandidates.removeEdge(child.xc, xc);
      }
    }
  }

  private *getAllCells(): Iterable<Cell> {
    // use a generator function to avoid re-building a new object
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        yield cells[cellId];
      }
    }
  }

  private evaluate() {
    const cellsBeingComputed = new Set<UID>();
    const computeCell = (xc: string): EvaluatedCell => {
      if (!this.currentXcsToUpdate.has(xc)) {
        const evaluation = this.evaluatedCells[xc];
        if (evaluation) {
          return evaluation; // already computed
        }
      }

      for (const child of this.spreadDependencies.getAdjacentNodes(xc)) {
        delete this.evaluatedCells[child.xc];
        this.findCellsToCompute(child.xc, false);
        for (const candidate of this.spreadCandidates.getTopDownAdjacentNodes(child.xc)) {
          this.findCellsToCompute(candidate.xc, true);
        }
      }
      this.spreadDependencies.removeNode(xc);

      const cell = this.XcToCell(xc);
      if (cell === undefined) {
        return createEvaluatedCell("");
      }
      //this.findCellsToCompute(xc, false); //TODO : really needed ?

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
      const mapSpreadPositionInMatrix = (
        matrix: MatrixValue,
        callback: (i: number, j: number) => void
      ) => {
        for (let i = 0; i < matrix.length; ++i) {
          for (let j = +!i; j < matrix[i].length; ++j) {
            callback(i, j);
          }
        }
      };

      const updateSpreadCandidates = (i: number, j: number) => {
        const position = { sheetId, col: i + col, row: j + row };
        const xc = this.cellPositionToXc(position);
        this.spreadCandidates.addEdge(xc, parentXC);
      };

      const checkCollision = (i: number, j: number) => {
        const rawCell = this.getters.getCell({ sheetId, col: col + i, row: row + j });
        if (
          rawCell?.content ||
          this.getEvaluatedCell({ sheetId, col: col + i, row: row + j }).type !==
            CellValueType.empty
        ) {
          throw `Array result was not expanded because it would overwrite data in ${toXC(
            col + i,
            row + j
          )}.`;
        }
      };

      const spreadValues = (i: number, j: number) => {
        const evaluatedCell = createEvaluatedCell(
          computedValue![i][j],
          cellData.format || computedFormat
        );

        const position = { sheetId, col: i + col, row: j + row };
        const xc = this.cellPositionToXc(position);

        // update evaluatedCells
        this.setEvaluatedCell(xc, evaluatedCell);
        this.spreadDependencies.addEdge(parentXC, xc);

        // check if formula dependencies present in the spread zone
        // if so, they need to be recomputed
        this.findCellsToCompute(xc, false);
      };

      const cellId = cellData.id;
      compilationParameters[2].__originCellXC = () => {
        // compute the value lazily for performance reasons
        const position = compilationParameters[2].getters.getCellPosition(cellId);
        return toXC(position.col, position.row);
      };
      let { value: computedValue, format: computedFormat } = cellData.compiledFormula.execute(
        cellData.dependencies,
        ...compilationParameters
      );

      if (computedValue === null) {
        return createEvaluatedCell(computedValue, cellData.format || computedFormat);
      }

      if (!isMatrix(computedValue)) {
        computedValue = [[computedValue]];
      }

      const { sheetId, col, row } = this.getters.getCellPosition(cellId);
      const parentXC = this.cellPositionToXc({ sheetId, col, row });

      mapSpreadPositionInMatrix(computedValue, updateSpreadCandidates);
      mapSpreadPositionInMatrix(computedValue, checkCollision);
      mapSpreadPositionInMatrix(computedValue, spreadValues);
      return createEvaluatedCell(computedValue[0][0], cellData.format || computedFormat);
    };

    const compilationParameters = this.getCompilationParameters(computeCell);

    for (let currentCycle = 0; currentCycle < this.maxCycle; ++currentCycle) {
      this.updateCellsToRecomputeAndRemoveRelatedSpreading();
      this.nextXcsToUpdate.clear();

      while (this.currentXcsToUpdate.size) {
        const [cell] = this.currentXcsToUpdate;
        this.setEvaluatedCell(cell, computeCell(cell));
      }
      if (!this.nextXcsToUpdate.size) {
        break;
      }
    }
    this.nextXcsToUpdate.clear();
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getCompilationParameters(
    computeCell: (xc: string) => EvaluatedCell
  ): CompilationParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;
    const cellPositionToXc = this.cellPositionToXc;

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
      const xc = cellPositionToXc(position);
      const evaluatedCell = getEvaluatedCell(xc);
      if (evaluatedCell.type === CellValueType.empty) {
        const cell = getters.getCell(position);
        if (!cell || cell.content === "") {
          return undefined;
        }
      }
      return evaluatedCell;
    };

    const getEvaluatedCell = (xc: string): EvaluatedCell => {
      const evaluatedCell = computeCell(xc);
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
          const position = { sheetId: range.sheetId, col, row };
          rowValues.push(getEvaluatedCellIfNotEmpty(position));
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
