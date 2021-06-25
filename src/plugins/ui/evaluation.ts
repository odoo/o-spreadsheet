import { MAXIMUM_EVALUATION_CHECK_DELAY_MS } from "../../constants";
import { compile, normalize } from "../../formulas/index";
import { functionRegistry } from "../../functions/index";
import { mapCellsInZone, toXC, toZone } from "../../helpers/index";
import { Mode, ModelConfig } from "../../model";
import { StateObserver } from "../../state_observer";
import { _lt } from "../../translation";
import {
  Cell,
  CellType,
  Command,
  CommandDispatcher,
  EnsureRange,
  EvalContext,
  Getters,
  NormalizedFormula,
  Range,
  ReferenceDenormalizer,
  UID,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";
function* makeObjectIterator(obj: Object) {
  for (let i in obj) {
    yield obj[i];
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

export class EvaluationPlugin extends UIPlugin {
  static getters = ["evaluateFormula", "isIdle", "getRangeFormattedValues", "getRangeValues"];
  static modes: Mode[] = ["normal", "readonly"];

  private isUpToDate: Set<UID> = new Set(); // Set<sheetIds>
  private loadingCells: number = 0;
  private isStarted: boolean = false;
  private readonly evalContext: EvalContext;

  /**
   * For all cells that are being currently computed (asynchronously).
   *
   * For example: =Wait(3)
   */
  private PENDING: Set<UID> = new Set();

  /**
   * For all cells that are NOT being currently computed, but depend on another
   * asynchronous computation.
   *
   * For example: A2 is in WAITING (initially) and A1 in PENDING
   *   A1: =Wait(3)
   *   A2: =A1
   */
  private WAITING: Set<UID> = new Set();

  /**
   * For all cells that have been async computed.
   *
   * For example:
   *  A1: =Wait(3)
   *  A2: =A1
   *
   * When A1 is computed, A1 is moved in COMPUTED
   */
  private COMPUTED: Set<UID> = new Set();

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(getters, state, dispatch, config);
    this.evalContext = config.evalContext;
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "RENAME_SHEET":
      case "DELETE_SHEET":
      case "CREATE_SHEET":
      case "ADD_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
      case "DELETE_CELL":
      case "INSERT_CELL":
        this.isUpToDate.clear();
        break;
      case "UPDATE_CELL":
        if ("content" in cmd) {
          this.isUpToDate.clear();
        }
        break;
      case "EVALUATE_CELLS":
        if (cmd.onlyWaiting) {
          const cellIds = new Set(this.WAITING);
          this.WAITING.clear();
          const cells = new Set();
          for (const id of cellIds) {
            const { sheetId, col, row } = this.getters.getCellPosition(id);
            const cell = this.getters.getCell(sheetId, col, row);
            if (cell) {
              cells.add(cell)
            }
          }
          this.evaluateCells(makeSetIterator(cells), cmd.sheetId);
        } else {
          this.WAITING.clear();
          this.evaluate(cmd.sheetId);
        }
        this.isUpToDate.add(cmd.sheetId);
        break;
      case "EVALUATE_ALL_SHEETS":
        this.evaluateAllSheets();
        break;
      case "UNDO":
      case "REDO":
        this.isUpToDate.clear();
        break;
    }
  }

  finalize() {
    const sheetId = this.getters.getActiveSheetId();
    if (!this.isUpToDate.has(sheetId)) {
      this.evaluate(sheetId);
      this.isUpToDate.add(sheetId);
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
    return this.loadingCells === 0 && this.WAITING.size === 0 && this.PENDING.size === 0;
  }

  getRangeFormattedValues(reference: string, defaultSheetId: UID): string[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    const sheet = sheetId ? this.getters.getSheet(sheetId) : undefined;
    if (sheet === undefined) return [[]];
    return mapCellsInZone(
      toZone(range),
      sheet,
      (cell) =>
        this.getters.getCellText(
          cell,
          sheetId || defaultSheetId,
          this.getters.shouldShowFormulas()
        ),
      ""
    );
  }

  getRangeValues(reference: string, defaultSheetId: UID): any[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    const sheet = sheetId ? this.getters.tryGetSheet(sheetId) : undefined;
    if (sheet === undefined) return [[]];
    return mapCellsInZone(toZone(range), sheet, (cell) => cell.value);
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
          this.dispatch("EVALUATE_CELLS", {
            onlyWaiting: true,
            sheetId: this.getters.getActiveSheetId(),
          });
          current = this.loadingCells;
          if (current === 0) {
            this.isStarted = false;
          }
        }
        if (current > 0) {
          window.setTimeout(recomputeCells, MAXIMUM_EVALUATION_CHECK_DELAY_MS);
        }
      };
      window.setTimeout(recomputeCells, 5);
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluator
  // ---------------------------------------------------------------------------

  private evaluate(sheetId: UID) {
    this.COMPUTED.clear();
    this.evaluateCells(makeObjectIterator(this.getters.getCells(sheetId)), sheetId);
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
      if (PENDING.has(cell.id)) {
        PENDING.delete(cell.id);
        self.loadingCells--;
      }
      if (e.message === "not ready") {
        WAITING.add(cell.id);
        cell.value = LOADING;
      } else if (!cell.error) {
        cell.value = "#ERROR";

        // apply function name
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
      if (COMPUTED.has(cell.id) || PENDING.has(cell.id)) {
        return;
      }
      visited[sheetId][xc] = null;
      cell.error = undefined;
      try {
        params[2].__originCellXC = xc;
        if (cell.formula.compiledFormula.async) {
          cell.value = LOADING;
          PENDING.add(cell.id);

          cell.formula
            .compiledFormula(cell.dependencies!, sheetId, ...params)
            .then((val) => {
              const { col, row } = params[2].getters.getCellPosition(cell.id);
              const c = params[2].getters.getCell(sheetId, col, row);
              c.value = val;
              self.loadingCells--;
              if (PENDING.has(cell.id)) {
                PENDING.delete(cell.id);
                COMPUTED.add(cell.id);
              }
            })
            .catch((e: Error) => handleError(e, cell));
          self.loadingCells++;
        } else {
          cell.value = cell.formula.compiledFormula(cell.dependencies!, sheetId, ...params);
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
      let cell: Cell | undefined;
      const s = sheets[range.sheetId];
      if (s) {
        cell = s.rows[range.zone.top]?.cells[range.zone.left];
      } else {
        throw new Error(_lt("Invalid sheet name"));
      }
      if (!cell || cell.type === CellType.empty) {
        return null;
      }
      return getCellValue(cell, range.sheetId);
    }

    function getCellValue(cell: Cell, sheetId: UID): any {
      if (
        cell.type === CellType.formula &&
        cell.formula.compiledFormula.async &&
        cell.error &&
        !PENDING.has(cell.id)
      ) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      computeValue(cell, sheetId);
      if (cell.error) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      if (cell.value === LOADING) {
        throw new Error("not ready");
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
      isMeta: boolean,
      functionName: string,
      paramNumber: number
    ): any | any[][] {
      const range: Range = references[position];

      if (isMeta) {
        return evalContext.getters.getRangeString(range, sheetId);
      }

      if (range.zone.top > range.zone.bottom || range.zone.left > range.zone.right) {
        throw new Error(
          _lt(
            "invalid range %s:%s",
            toXC(range.zone.left, range.zone.top),
            toXC(range.zone.right, range.zone.bottom)
          )
        );
      }

      // if the formula definition could have accepted a range, we would pass through the _range function and not here
      if (range.zone.bottom !== range.zone.top || range.zone.left !== range.zone.right) {
        throw new Error(
          _lt(
            "Function %s expects the parameter %s to be a single value or a single cell reference, not a range.",
            functionName.toString(),
            paramNumber.toString()
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
      if (!this.isUpToDate.has(sheetId)) {
        this.evaluate(sheetId);
        this.isUpToDate.add(sheetId);
      }
    }
    this.startScheduler();
  }
}
