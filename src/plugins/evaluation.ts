import { BasePlugin } from "../base_plugin";
import { compile, normalize } from "../formulas/index";
import { functionRegistry } from "../functions/index";
import { mapCellsInZone, toCartesian, toXC, toZone } from "../helpers/index";
import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import { _lt } from "../translation";
import {
  Cell,
  Command,
  CommandDispatcher,
  EnsureRange,
  EvalContext,
  Getters,
  NormalizedFormula,
  ReferenceDenormalizer,
  UID,
  Workbook,
} from "../types";

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

export class EvaluationPlugin extends BasePlugin {
  static getters = ["evaluateFormula", "isIdle"];
  static modes: Mode[] = ["normal", "readonly"];

  private isUptodate: Set<string> = new Set();
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
  private WAITING: { [key: string]: Set<Cell> } = {};

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
    workbook: Workbook,
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(workbook, getters, history, dispatch, config);
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
          this.isUptodate.clear();
        }
        break;
      case "EVALUATE_CELLS":
        if (cmd.onlyWaiting) {
          for (const sheetId in this.WAITING) {
            const cells = new Set(this.WAITING[sheetId]);
            this.WAITING[sheetId].clear();
            this.evaluateCells(makeSetIterator(cells), sheetId);
          }
        } else {
          for (const sheetId in this.WAITING) {
            delete this.WAITING[sheetId];
          }
          this.evaluate();
        }
        this.isUptodate.add(this.workbook.activeSheet.id);
        break;
      case "UNDO":
      case "REDO":
        this.isUptodate.clear();
        break;
    }
  }

  finalize() {
    if (!this.isUptodate.has(this.workbook.activeSheet.id)) {
      this.evaluate();
      this.isUptodate.add(this.workbook.activeSheet.id);
    }
    if (this.loadingCells > 0) {
      this.startScheduler();
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formula: string, sheet: UID = this.workbook.activeSheet.id): any {
    let formulaString: NormalizedFormula = normalize(formula);

    const compiledFormula = compile(formulaString);
    const params = this.getFormulaParameters(() => {});
    return compiledFormula(formulaString.dependencies, sheet, ...params);
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
      makeObjectIterator(this.workbook.activeSheet.cells),
      this.workbook.activeSheet.id
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

    function handleError(e: Error | any, currentCell: Cell, currentSheetId: string) {
      if (!(e instanceof Error)) {
        e = new Error(e);
      }
      if (PENDING.has(currentCell)) {
        PENDING.delete(currentCell);
        self.loadingCells--;
      }
      if (e.message === "not ready") {
        if (!WAITING[currentSheetId]) {
          WAITING[currentSheetId] = new Set<Cell>();
        }
        WAITING[currentSheetId].add(currentCell);
        currentCell.pending = true;
        currentCell.value = LOADING;
      } else if (!currentCell.error) {
        currentCell.value = "#ERROR";
        const __lastFnCalled = params[2].__lastFnCalled || "";
        currentCell.error = e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled);
      }
    }

    function computeValue(cell: Cell, sheetId: string) {
      if (cell.type !== "formula" || !cell.formula) {
        return;
      }
      const xc = cell.xc;
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
        // todo: move formatting in grid and formatters.js
        if (cell.formula.compiledFormula.async) {
          cell.value = LOADING;
          cell.pending = true;
          PENDING.add(cell);

          cell.formula
            .compiledFormula(cell.formula.dependencies, sheetId, ...params)
            .then((val) => {
              cell.value = val;
              self.loadingCells--;
              if (PENDING.has(cell)) {
                PENDING.delete(cell);
                cell.pending = false;
                COMPUTED.add(cell);
              }
            })
            .catch((e: Error) => handleError(e, cell, sheetId));
          self.loadingCells++;
        } else {
          cell.value = cell.formula.compiledFormula(cell.formula.dependencies, sheetId, ...params);
          cell.pending = false;
        }
        if (Array.isArray(cell.value)) {
          // if a value returns an array (like =A1:A3)
          throw new Error(_lt("This formula depends on invalid values"));
        } else {
          cell.error = undefined;
        }
      } catch (e) {
        handleError(e, cell, sheetId);
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
    const sheets = this.workbook.sheets;
    const PENDING = this.PENDING;
    function readCell(xc: string, sheetId: UID): any {
      let cell;
      const s = sheets[sheetId];
      if (s) {
        cell = s.cells[xc.toUpperCase().replace(/\$/g, "")];
      } else {
        throw new Error(_lt("Invalid sheet name"));
      }
      if (!cell || cell.content === "") {
        return null;
      }
      const value = getCellValue(cell, sheetId);
      if (value === LOADING) {
        throw new Error("not ready");
      }
      return value;
    }

    function getCellValue(cell: Cell, sheetId: UID): any {
      if (cell.formula && cell.formula.compiledFormula.async && cell.error && !PENDING.has(cell)) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      computeValue(cell, sheetId);
      if (cell.error) {
        throw new Error(_lt("This formula depends on invalid values"));
      }
      return cell.value;
    }

    /**
     * Return a range of values. It is a list of col values.
     *
     * Note that each col is possibly sparse: it only contain the values of cells
     * that are actually present in the grid.
     */
    function _range(v1: string, v2: string, sheetId: UID): any[][] {
      const sheet = sheets[sheetId];
      let [left, top] = toCartesian(v1);
      let [right, bottom] = toCartesian(v2);
      right = Math.min(right, sheet.colNumber - 1);
      bottom = Math.min(bottom, sheet.rowNumber - 1);

      if (left > right) {
        const tmp = left;
        left = right;
        right = tmp;
      }
      if (top > bottom) {
        const tmp = top;
        top = bottom;
        bottom = tmp;
      }

      const zone = { left, top, right, bottom };
      const result = mapCellsInZone(zone, sheet, (cell) => getCellValue(cell, sheetId));
      for (const col of result) {
        for (const value of col) {
          if (value === LOADING) {
            throw new Error("not ready");
          }
        }
      }
      return result;
    }

    /**
     * Returns the value of the cell(s) used in reference
     *
     * @param position the index in the references array
     * @param references all the references used in the current formula
     * @param sheetId the sheet that is currently being evaluated, if a reference does not
     *        include a sheet, it is the id of the sheet of the reference to be used
     */
    function refFn(
      position: number,
      references: string[],
      sheetId: UID,
      functionName: string,
      paramNumber: number
    ): any | any[][] {
      const referenceText = references[position];

      const [reference, sheetName] = referenceText.split("!").reverse();
      const referenceSheetId = sheetName
        ? evalContext.getters.getSheetIdByName(sheetName)
        : sheetId;

      const zone = toZone(referenceText);

      if (zone.top > zone.bottom || zone.left > zone.right) {
        throw new Error(
          _lt("invalid range %s:%s", toXC(zone.left, zone.top), toXC(zone.right, zone.bottom))
        );
      }

      // if the formula definition could have accepted a range, we would pass through the _range function and not here
      if (zone.bottom !== zone.top || zone.left !== zone.right) {
        throw new Error(
          _lt(
            "Function %s expects the parameter %s to be a single value or a single cell reference, not a range.",
            functionName.toString(),
            paramNumber.toString()
          )
        );
      }
      //it's a cell
      return readCell(reference, referenceSheetId);
    }

    /**
     * Return the values of the cell(s) used in reference, but always in the format of a range even
     * if a single cell is referenced. This is useful for the formulas that describe parameters as
     * range<number> etc.
     *
     * the parameters are the same as refFn, except that these parameters cannot be Meta
     */
    function range(position: number, references: string[], sheetId: UID): any[][] {
      const referenceText = references[position];
      const [reference, sheetName] = referenceText.split("!").reverse();
      const referenceSheetId = sheetName
        ? evalContext.getters.getSheetIdByName(sheetName)
        : sheetId;

      if (references[position] && !references[position].includes(":")) {
        //it's a cell reference, but it must be treated as a range
        return _range(reference, reference, referenceSheetId);
      } else {
        const [left, right] = reference.split(":");
        return _range(left, right, referenceSheetId);
      }
    }

    return [refFn, range, evalContext];
  }
}
