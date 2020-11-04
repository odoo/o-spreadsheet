import { BasePlugin } from "../base_plugin";
import { functionRegistry } from "../functions/index";
import { mapCellsInZone, toXC } from "../helpers/index";
import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import {
  Cell,
  Command,
  CommandDispatcher,
  EvalContext,
  Getters,
  UID,
  ReferenceDenormalizer,
  EnsureRange,
  NormalizedFormula,
  Range,
} from "../types";
import { _lt } from "../translation";
import { compile, normalize } from "../formulas/index";

function* makeObjectIterator(obj: Object, predicate: (cell: any) => boolean) {
  for (let i in obj) {
    if (predicate && predicate(obj[i])) {
      yield obj[i];
    }
  }
}

function* makeSetIterator(set: Set<any>) {
  for (let elem of set) {
    yield elem;
  }
}

const functionMap = functionRegistry.mapping;

type FormulaParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];

export const LOADING = "Loading...";

export class EvaluationPlugin extends BasePlugin {
  static getters = ["evaluateFormula", "isIdle"];
  static modes: Mode[] = ["normal", "readonly"];

  private isUpToDate: Set<UID> = new Set();
  private loadingCells: number = 0;
  private isStarted: boolean = false;
  private evalContext: EvalContext;

  /**
   * For all cells that are being currently computed (asynchronously).
   *
   * For example: =Wait(3)
   */
  private PENDING: Set<Cell> = new Set();

  /**
   * For all cells that are NOT being currently computed, but depend on another
   * asynchronous computation.
   *
   * For example: A2 is in WAITING (initially) and A1 in PENDING
   *   A1: =Wait(3)
   *   A2: =A1
   */
  private WAITING: Set<Cell> = new Set();

  /**
   * For all cells that have been async computed.
   *
   * For example:
   *  A1: =Wait(3)
   *  A2: =A1
   *
   * When A1 is computed, A1 is moved in COMPUTED
   */
  private COMPUTED: Set<Cell> = new Set();

  constructor(
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, history, dispatch, config);
    this.evalContext = config.evalContext;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.evaluate();
        break;
      case "UPDATE_CELL":
        if ("content" in cmd) {
          this.isUpToDate.clear();
        }
        break;
      case "EVALUATE_CELLS":
        const activeSheet = this.getters.getActiveSheetId();
        if (cmd.onlyWaiting) {
          const cells = new Set(this.WAITING);
          this.WAITING.clear();
          this.evaluateCells(makeSetIterator(cells), activeSheet);
        } else {
          this.WAITING.clear();
          this.evaluate();
        }
        this.isUpToDate.add(activeSheet);
        break;
      case "UNDO":
      case "REDO":
        this.isUpToDate.clear();
        break;
    }
  }

  finalize() {
    const activeSheet = this.getters.getActiveSheetId();
    if (!this.isUpToDate.has(activeSheet)) {
      this.evaluate();
      this.isUpToDate.add(activeSheet);
    }
    if (this.loadingCells > 0) {
      this.startScheduler();
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formula: string, sheetId: UID = this.getters.getActiveSheetId()): any {
    let formulaString: NormalizedFormula = normalize(formula);
    const compiledFormula = compile(formulaString);
    const params = this.getFormulaParameters(() => {});

    const ranges: Range[] = [];
    for (let xc of formulaString.dependencies) {
      ranges.push(this.getters.getRangeFromSheetXC(sheetId, xc));
    }

    return compiledFormula(ranges, sheetId, ...params);
  }

  isIdle() {
    return this.loadingCells === 0;
  }

  // ---------------------------------------------------------------------------
  // Scheduler
  // ---------------------------------------------------------------------------

  private startScheduler() {
    if (!this.isStarted) {
      this.isStarted = true;
      let current = this.loadingCells;
      const recomputeCells = () => {
        if (this.loadingCells !== current) {
          this.dispatch("EVALUATE_CELLS", { onlyWaiting: true });
          current = this.loadingCells;
          if (current === 0) {
            this.isStarted = false;
          }
        }
        if (current > 0) {
          window.setTimeout(recomputeCells, 15);
        }
      };
      window.setTimeout(recomputeCells, 5);
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------

  private evaluate() {
    this.COMPUTED.clear();
    this.evaluateCells(
      makeObjectIterator(this.getters.getCells(), (cell: Cell) => {
        return !!cell.pending;
      }),
      this.getters.getActiveSheetId()
    );
  }

  private evaluateCells(cells: Generator<Cell>, sheetId: string) {
    const self = this;
    const { COMPUTED, PENDING, WAITING } = this;
    const params = this.getFormulaParameters(computeValue);
    const visited: { [sheetId: string]: { [xc: string]: boolean | null } } = {};

    for (let cell of cells) {
      computeValue(cell, sheetId);
    }

    function handleError(e: Error | any, cell: Cell) {
      if (!(e instanceof Error)) {
        e = new Error(e);
      }
      if (PENDING.has(cell)) {
        PENDING.delete(cell);
        self.loadingCells--;
      }
      if (e.message === "not ready") {
        WAITING.add(cell);
        cell.pending = true;
        cell.value = LOADING;
      } else if (!cell.error) {
        cell.value = "#ERROR";
        const __lastFnCalled = params[2].__lastFnCalled || "";
        cell.error = e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled);
      }
    }

    function computeValue(cell: Cell, sheetId: string) {
      if (cell.type !== "formula" || !cell.formula) {
        return;
      }
      const position = params[2].getters.getCellPosition(cell.id);
      const xc = toXC(position.col, position.row);
      visited[sheetId] = visited[sheetId] || {};
      if (xc in visited[sheetId]) {
        if (visited[sheetId][xc] === null) {
          cell.value = "#CYCLE";
          cell.error = _lt("Circular reference");
        }
        return;
      }
      if (COMPUTED.has(cell) || PENDING.has(cell)) {
        return;
      }
      visited[sheetId][xc] = null;
      cell.error = undefined;
      try {
        params[2].__originCellXC = xc;
        if (cell.formula.compiledFormula.async) {
          cell.value = LOADING;
          cell.pending = true;
          PENDING.add(cell);

          cell.formula
            .compiledFormula(cell.dependencies!, sheetId, ...params)
            .then((val) => {
              cell.value = val;
              self.loadingCells--;
              if (PENDING.has(cell)) {
                PENDING.delete(cell);
                cell.pending = false;
                COMPUTED.add(cell);
              }
            })
            .catch((e: Error) => handleError(e, cell));
          self.loadingCells++;
        } else {
          cell.value = cell.formula.compiledFormula(cell.dependencies!, sheetId, ...params);
          cell.pending = false;
        }
        if (Array.isArray(cell.value)) {
          // if a value returns an array (like =A1:A3)
          throw new Error(_lt("This formula depends on invalid values"));
        } else {
          cell.error = undefined;
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
    const sheets = this.getters.getEvaluationSheets();
    const PENDING = this.PENDING;
    function readCell(range: Range): any {
      let cell;
      const s = sheets[range.sheetId];
      if (s) {
        cell = s.rows[range.zone.top].cells[range.zone.left];
      } else {
        throw new Error(_lt("Invalid sheet name"));
      }
      if (!cell || cell.content === "") {
        return null;
      }
      return getCellValue(cell, range.sheetId);
    }

    function getCellValue(cell: Cell, sheetId: UID): any {
      if (cell.formula && cell.formula.compiledFormula.async && cell.error && !PENDING.has(cell)) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      if (typeof cell.pending === "undefined" || cell.pending === true) {
        computeValue(cell, sheetId);
        if (cell.error) {
          throw new Error(_lt("This formula depends on invalid values"));
        }
        if (cell.value === LOADING) {
          throw new Error("not ready");
        }
      }

      return cell.value;
    }

    /**
     * Return a range of values. It is a list of col values.
     *
     * Note that each col is possibly sparse: it only contain the values of cells
     * that are actually present in the grid.
     */
    function _range(range: Range): any[][] {
      const sheet = sheets[range.sheetId]!;

      const zone = {
        left: range.zone.left,
        top: range.zone.top,
        right: Math.min(range.zone.right, sheet.cols.length - 1),
        bottom: Math.min(range.zone.bottom, sheet.rows.length - 1),
      };
      return mapCellsInZone(zone, sheet, (cell) => getCellValue(cell, range.sheetId));
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
      isMeta: boolean = false
    ): any | any[][] {
      const range: Range = references[position];

      if (isMeta) {
        return evalContext.getters.getRangeString(range.id, sheetId);
      }
      if (range.invalidSheetName) {
        throw new Error(_lt(`Invalid sheet name: ${range.invalidSheetName}`));
      }
      if (range.zone.left !== range.zone.right || range.zone.top !== range.zone.bottom) {
        // it's a range
        return _range(range);
      } else {
        //it's a cell
        return readCell(range);
      }
    }

    /**
     * Return the values of the cell(s) used in reference, but always in the format of a range even
     * if a single cell is referenced. This is useful for the formulas that describe parameters as
     * range<number> etc.
     *
     * the parameters are the same as refFn, except that these parameters cannot be Meta
     */
    function range(position: number, references: Range[]): any[][] {
      return _range(references[position]);
    }

    return [refFn, range, evalContext];
  }
}
