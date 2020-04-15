import { BasePlugin } from "../base_plugin";
import { functionRegistry } from "../functions/index";
import { Cell, Command, Sheet } from "../types";
import { compile } from "../formulas/index";
import { toCartesian } from "../helpers/index";
import { Mode } from "../model";

const functionMap = functionRegistry.mapping;

type EvalContext = { [key: string]: any };
type ReadCell = (xc: string, sheet: string) => any;
type Range = (v1: string, v2: string, sheetName: string) => any[];
type FormulaParameters = [ReadCell, Range, EvalContext];

export class EvaluationPlugin extends BasePlugin {
  static getters = ["evaluateFormula"];
  static modes: Mode[] = ["normal", "readonly"];

  private isUptodate: Set<string> = new Set();
  private loadingCells: number = 0;
  private isStarted: boolean = false;
  private cache: { [key: string]: Function } = {};

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

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.evaluateCells();
        break;
      case "UPDATE_CELL":
        if ("content" in cmd) {
          this.isUptodate.clear();
        }
        break;
      case "EVALUATE_CELLS":
        this.evaluateCells(cmd.onlyWaiting);
        this.isUptodate.add(this.workbook.activeSheet.name);
        break;
      case "UNDO":
      case "REDO":
        this.isUptodate.clear();
        break;
    }
  }

  finalize() {
    if (!this.isUptodate.has(this.workbook.activeSheet.name)) {
      this.evaluateCells();
      this.isUptodate.add(this.workbook.activeSheet.name);
    }
    if (this.loadingCells > 0) {
      this.startScheduler();
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  evaluateFormula(formula: string, sheet: string = this.workbook.activeSheet.name): any {
    const cacheKey = `${sheet}#${formula}`;
    let compiledFormula;
    if (cacheKey in this.cache) {
      compiledFormula = this.cache[cacheKey];
    } else {
      compiledFormula = compile(formula, sheet);
      this.cache[cacheKey] = compiledFormula;
    }
    const params = this.getFormulaParameters(() => {});
    return compiledFormula(...params);
  }

  // ---------------------------------------------------------------------------
  // Scheduler
  // ---------------------------------------------------------------------------

  /**
   * todo: move this into evaluation plugin
   */
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

  private evaluateCells(onlyWaiting: boolean = false) {
    const { COMPUTED, PENDING, WAITING } = this;
    const params = this.getFormulaParameters(computeValue);

    if (!onlyWaiting) {
      COMPUTED.clear();
    }
    const visited = {};

    const self = this;
    function handleError(e: Error, cell: Cell) {
      if (PENDING.has(cell)) {
        PENDING.delete(cell);
        self.loadingCells--;
      }
      if (e.message === "not ready") {
        WAITING.add(cell);
        cell.value = "#LOADING";
      } else if (!cell.error) {
        cell.value = "#ERROR";
        cell.error = true;
      }
    }

    function computeValue(cell: Cell) {
      if (cell.type !== "formula" || !cell.formula) {
        return;
      }
      const xc = cell.xc;
      if (xc in visited) {
        if (visited[xc] === null) {
          cell.value = "#CYCLE";
          cell.error = true;
        }
        return;
      }
      if (COMPUTED.has(cell) || PENDING.has(cell)) {
        return;
      }
      visited[xc] = null;
      cell.error = false;
      try {
        // todo: move formatting in grid and formatters.js
        if (cell.async) {
          cell.value = "#LOADING";
          PENDING.add(cell);
          cell
            .formula(...params)
            .then((val) => {
              cell.value = val;
              self.loadingCells--;
              if (PENDING.has(cell)) {
                PENDING.delete(cell);
                COMPUTED.add(cell);
              }
            })
            .catch((e: Error) => handleError(e, cell));
          self.loadingCells++;
        } else {
          cell.value = cell.formula(...params);
        }
        cell.error = false;
      } catch (e) {
        handleError(e, cell);
      }
      visited[xc] = true;
    }

    if (onlyWaiting) {
      const clone: Set<Cell> = new Set(WAITING);
      WAITING.clear();
      for (let cell of clone) {
        computeValue(cell);
      }
    } else {
      const cells = this.workbook.cells;
      for (let xc in cells) {
        const cell = cells[xc];
        computeValue(cell);
      }
    }
  }

  /**
   * Return all functions necessary to properly evaluate a formula:
   * - a readCell function to read the value of a cell
   * - a range function to convert a range description into a proper value array
   * - an evaluation context
   */
  private getFormulaParameters(computeValue: Function): FormulaParameters {
    const sheets: { [name: string]: Sheet } = {};
    for (let sheet of this.workbook.sheets) {
      sheets[sheet.name] = sheet;
    }

    const evalContext = Object.assign(Object.create(functionMap), {
      getEntity: this.getters.getEntity,
      getEntities: this.getters.getEntities,
    });

    function readCell(xc: string, sheet: string): any {
      let cell;
      const s = sheets[sheet];
      if (s) {
        cell = s.cells[xc];
      } else {
        throw new Error("Invalid sheet name");
      }
      if (!cell || cell.content === "") {
        return null;
      }
      return getCellValue(cell);
    }

    function getCellValue(cell: Cell): any {
      computeValue(cell);
      if (cell.error) {
        throw new Error("boom");
      }
      if (cell.value === "#LOADING") {
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
    function range(v1: string, v2: string, sheetName: string): any[] {
      const sheet = sheets[sheetName];
      const [c1, r1] = toCartesian(v1);
      const [c2, r2] = toCartesian(v2);
      const result: any[] = new Array(c2 - c1 + 1);
      for (let c = c1; c <= c2; c++) {
        let col: any[] = new Array(r2 - r1 + 1);
        result[c - c1] = col;
        for (let r = r1; r <= r2; r++) {
          let cell = sheet.rows[r].cells[c];
          if (cell) {
            col[r - r1] = getCellValue(cell);
          }
        }
      }
      return result;
    }

    return [readCell, range, evalContext];
  }
}
