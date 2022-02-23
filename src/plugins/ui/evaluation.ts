import { INCORRECT_RANGE_STRING } from "../../constants";
import { compile } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { isZoneValid, range as rangeSequence, toXC } from "../../helpers/index";
import { Mode, ModelConfig } from "../../model";
import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import { StateObserver } from "../../state_observer";
import { _lt } from "../../translation";
import { InvalidReferenceError } from "../../types/errors";
import {
  Cell,
  CellValue,
  CellValueType,
  Command,
  CommandDispatcher,
  EnsureRange,
  EvalContext,
  FormulaCell,
  Getters,
  invalidateEvaluationCommands,
  Range,
  ReferenceDenormalizer,
  UID,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

const functionMap = functionRegistry.mapping;

type FormulaParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];

export class EvaluationPlugin extends UIPlugin {
  static getters = ["evaluateFormula", "getRangeFormattedValues", "getRangeValues"] as const;
  static modes: Mode[] = ["normal"];

  private isUpToDate: Set<UID> = new Set(); // Set<sheetIds>
  private readonly evalContext: EvalContext;

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig,
    selection: SelectionStreamProcessor
  ) {
    super(getters, state, dispatch, config, selection);
    this.evalContext = config.evalContext;
    config.dataSources.on("data-loaded", this, () => {
      this.dispatch("EVALUATE_CELLS", { sheetId: this.getters.getActiveSheetId() });
    });
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    if (invalidateEvaluationCommands.has(cmd.type)) {
      this.isUpToDate.clear();
    }
    switch (cmd.type) {
      case "UPDATE_CELL":
        if ("content" in cmd) {
          this.isUpToDate.clear();
        }
        break;
      case "EVALUATE_CELLS":
        this.evaluate(cmd.sheetId);
        this.isUpToDate.add(cmd.sheetId);
        break;
      case "EVALUATE_ALL_SHEETS":
        this.evaluateAllSheets();
        break;
    }
  }

  finalize() {
    const sheetId = this.getters.getActiveSheetId();
    if (!this.isUpToDate.has(sheetId)) {
      this.evaluate(sheetId);
      this.isUpToDate.add(sheetId);
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formulaString: string, sheetId: UID = this.getters.getActiveSheetId()): any {
    const compiledFormula = compile(formulaString);
    const params = this.getFormulaParameters(() => {});

    const ranges: Range[] = [];
    for (let xc of compiledFormula.dependencies) {
      ranges.push(this.getters.getRangeFromSheetXC(sheetId, xc));
    }
    return compiledFormula.execute(ranges, sheetId, ...params);
  }

  /**
   * Return the value of each cell in the range as they are displayed in the grid.
   */
  getRangeFormattedValues(range: Range): string[] {
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

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------

  private evaluate(sheetId: UID) {
    const cells = this.getters.getCells(sheetId);
    const params = this.getFormulaParameters(computeValue);
    const visited: { [sheetId: string]: { [xc: string]: boolean | null } } = {};
    for (let cell of Object.values(cells)) {
      if (cell.isFormula()) {
        cell.startEvaluation();
      }
    }

    for (let cell of Object.values(cells)) {
      computeValue(cell, sheetId);
    }

    function handleError(e: Error | any, cell: FormulaCell) {
      if (!(e instanceof Error)) {
        e = new Error(e);
      }
      if (cell.evaluated.type !== CellValueType.error) {
        const msg = e instanceof InvalidReferenceError ? INCORRECT_RANGE_STRING : "#ERROR";
        // apply function name
        const __lastFnCalled = params[2].__lastFnCalled || "";
        cell.assignError(msg, e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled));
      }
    }

    function computeValue(cell: Cell, sheetId: string) {
      if (!cell.isFormula()) {
        return;
      }
      const position = params[2].getters.getCellPosition(cell.id);
      const xc = toXC(position.col, position.row);
      visited[sheetId] = visited[sheetId] || {};
      if (xc in visited[sheetId]) {
        if (visited[sheetId][xc] === null) {
          cell.assignError("#CYCLE", _lt("Circular reference"));
        }
        return;
      }
      visited[sheetId][xc] = null;
      try {
        params[2].__originCellXC = xc;
        cell.assignValue(cell.compiledFormula.execute(cell.dependencies, sheetId, ...params));
        if (Array.isArray(cell.evaluated.value)) {
          // if a value returns an array (like =A1:A3)
          throw new Error(_lt("This formula depends on invalid values"));
        }
      } catch (e) {
        handleError(e, cell);
      }
      visited[sheetId][xc] = true;
    }
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a refFn function to read any reference, cell or range of a normalized formula
   * - a range function to convert any reference to a proper value array
   * - an evaluation context
   */
  private getFormulaParameters(computeValue: Function): FormulaParameters {
    const evalContext = Object.assign(Object.create(functionMap), this.evalContext, {
      getters: this.getters,
    });
    const getters = this.getters;
    function readCell(range: Range): any {
      let cell: Cell | undefined;
      if (!getters.tryGetSheet(range.sheetId)) {
        throw new Error(_lt("Invalid sheet name"));
      }
      cell = getters.getCell(range.sheetId, range.zone.left, range.zone.top);
      if (!cell || cell.isEmpty()) {
        // magic "empty" value
        return null;
      }
      return getCellValue(cell, range.sheetId);
    }

    function getCellValue(cell: Cell, sheetId: UID): CellValue {
      if (cell.isFormula() && cell.evaluated.type === CellValueType.error) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      computeValue(cell, sheetId);
      if (cell.evaluated.type === CellValueType.error) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      return cell.evaluated.value;
    }

    /**
     * Return a range of values. It is a list of col values.
     *
     * Note that each col is possibly sparse: it only contain the values of cells
     * that are actually present in the grid.
     */
    function _range(range: Range): (CellValue | undefined)[][] {
      const sheetId = range.sheetId;

      if (!isZoneValid(range.zone)) {
        throw new InvalidReferenceError();
      }

      const zone = range.zone;
      return rangeSequence(zone.left, zone.right + 1).map((col) =>
        getters
          .getCellsInZone(sheetId, { ...zone, left: col, right: col })
          .map((cell) => (cell ? getCellValue(cell, range.sheetId) : undefined))
      );
    }

    /**
     * Returns the value of the cell(s) used in reference
     *
     * @param position the index in the references array
     * @param references all the references used in the current formula
     * @param sheetId the sheet that is currently being evaluated, if a reference does not
     *        include a sheet, it is the id of the sheet of the reference to be used
     * @param isMeta if a reference is supposed to be used in a `meta` parameter as described in the
     *        function for which this parameter is used, we just return the string of the parameter.
     *        The `compute` of the formula's function must process it completely
     */
    function refFn(
      position: number,
      references: Range[],
      sheetId: UID,
      isMeta: boolean,
      functionName: string,
      paramNumber?: number
    ): any | any[][] {
      const range: Range = references[position];

      if (isMeta) {
        return evalContext.getters.getRangeString(range, sheetId);
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

    /**
     * Return the values of the cell(s) used in reference, but always in the format of a range even
     * if a single cell is referenced. This is useful for the formulas that describe parameters as
     * range<number> etc.
     *
     * the parameters are the same as refFn, except that these parameters cannot be Meta
     */
    function range(position: number, references: Range[], sheetId: UID): any[][] {
      return _range(references[position]);
    }

    return [refFn, range, evalContext];
  }

  /**
   * Triggers an evaluation of all cells on all sheets.
   */
  private evaluateAllSheets() {
    for (const sheetId of this.getters.getVisibleSheets()) {
      this.evaluate(sheetId);
      this.isUpToDate.add(sheetId);
    }
  }
}
