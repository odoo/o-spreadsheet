import { BasePlugin } from "../base_plugin";
import { functionRegistry } from "../functions/index";
import { Cell, Command, Sheet, EvalContext, Dependency, CommandResult } from "../types";
import { compile } from "../formulas/index";
import { toCartesian, toXC } from "../helpers/index";
import { Mode } from "../model";

type DependencyGraph = { [sheet: string]: { [xc: string]: { [sheet: string]: Set<string> } } };

function* makeSetIterator(set: Set<any>) {
  for (let elem of set) {
    yield elem;
  }
}

const functionMap = functionRegistry.mapping;

type ReadCell = (xc: string, sheet: string) => any;
type Range = (v1: string, v2: string, sheetName: string) => any[];
type FormulaParameters = [ReadCell, Range, EvalContext];

export class EvaluationPlugin extends BasePlugin {
  static getters = ["evaluateFormula"];
  static modes: Mode[] = ["normal", "readonly"];

  private upToDate: Set<Cell> = new Set();
  private isDirty: boolean = false;

  private loadingCells: number = 0;
  private isStarted: boolean = false;
  private cache: { [key: string]: Function } = {};

  private dependencyGraph: DependencyGraph = {};

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

  allowDispatch(): CommandResult {
    this.isDirty = false;
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.buildDependencyGraph();
        this.evaluate();
        break;
      case "ACTIVATE_SHEET":
        this.isDirty = true;
        break;
      case "CREATE_SHEET":
        for (let sheet of this.workbook.sheets) {
          this.dependencyGraph[sheet.name] = this.dependencyGraph[sheet.name] || {};
        }
        break;
      case "UPDATE_CELL":
        if ("content" in cmd) {
          this.isDirty = true;
          const sheet = this.workbook.sheets.find((s) => s.name === cmd.sheet)!;
          const cell = sheet.rows[cmd.row].cells[cmd.col];
          if (cell) {
            this.addCellToGraph(sheet.name, cell);
          }
          this.clearDependency(sheet.name, cell ? cell.xc : toXC(cmd.col, cmd.row));
        }
        break;
      case "EVALUATE_CELLS":
        const cells = new Set(this.WAITING);
        this.WAITING.clear();

        this.evaluateCells(makeSetIterator(cells));
        break;
      case "UNDO":
      case "REDO":
        this.isDirty = true;
        this.upToDate.clear();
        break;
    }
  }

  finalize() {
    if (this.isDirty) {
      this.evaluate();
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
    const cells = this.workbook.cells;
    const upToDateCells = this.upToDate;
    this.evaluateCells(makeIterator());
    function* makeIterator() {
      for (let i in cells) {
        const cell = cells[i];
        if (!upToDateCells.has(cell)) {
          yield cell;
        }
      }
    }

    // this.evaluateCells(makeObjectIterator(this.workbook.cells));
  }

  private evaluateCells(cells: Generator<Cell>) {
    const self = this;
    const { COMPUTED, PENDING, WAITING, upToDate } = this;
    const params = this.getFormulaParameters(computeValue);
    const visited = {};

    for (let cell of cells) {
      computeValue(cell);
    }

    function handleError(e: Error, cell: Cell) {
      if (PENDING.has(cell)) {
        PENDING.delete(cell);
        self.loadingCells--;
      }
      if (e.message === "not ready") {
        WAITING.add(cell);
        cell.pending = true;
        cell.value = "#LOADING";
      } else if (!cell.error) {
        cell.value = "#ERROR";
        const __lastFnCalled = params[2].__lastFnCalled || "";
        cell.error = e.message.replace("[[FUNCTION_NAME]]", __lastFnCalled);
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
          cell.error = "Circular reference";
        }
        return;
      }
      upToDate.add(cell);
      if (COMPUTED.has(cell) || PENDING.has(cell)) {
        return;
      }
      visited[xc] = null;
      cell.error = undefined;
      try {
        // todo: move formatting in grid and formatters.js
        if (cell.async) {
          cell.value = "#LOADING";
          cell.pending = true;
          PENDING.add(cell);
          cell
            .formula(...params)
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
          cell.value = cell.formula(...params);
          cell.pending = false;
        }
        cell.error = undefined;
      } catch (e) {
        handleError(e, cell);
      }
      visited[xc] = true;
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
      getters: this.getters,
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
        throw new Error("This formula depends on invalid values");
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

  // ---------------------------------------------------------------------------
  // Dependency Handling
  // ---------------------------------------------------------------------------
  private buildDependencyGraph() {
    for (let sheet of this.workbook.sheets) {
      this.dependencyGraph[sheet.name] = {};
    }
    for (let sheet of this.workbook.sheets) {
      const { cells, name } = sheet;
      for (let xc in cells) {
        const cell = cells[xc];
        this.addCellToGraph(name, cell);
      }
    }
  }

  private addCellToGraph(sheet: string, cell: Cell) {
    if (cell.type === "formula" && cell.formula) {
      const deps = cell.formula.deps;
      for (let dep of deps) {
        this.addToGraph(sheet, cell.xc, dep);
      }
    }
  }

  private addToGraph(sheet: string, xc: string, dep: Dependency) {
    const depGraph = this.dependencyGraph[dep.sheet];
    if (!depGraph) {
      // invalid sheet name. nothing to do, it will be caught and handled
      // when the origin cell is evaluated
      return;
    }
    if (dep.type === "cell") {
      depGraph[dep.xc] = depGraph[dep.xc] || {};
      depGraph[dep.xc][sheet] = depGraph[dep.xc][sheet] || new Set();
      depGraph[dep.xc][sheet].add(xc);
    } else {
      const [c1, r1] = toCartesian(dep.left);
      const [c2, r2] = toCartesian(dep.right);
      const left = Math.min(c1, c2);
      const right = Math.max(c1, c2);
      const top = Math.min(r1, r2);
      const bottom = Math.max(r1, r2);
      for (let col = left; col <= right; col++) {
        for (let row = top; row <= bottom; row++) {
          // need to add col,row dep
          const depxc = toXC(col, row);
          depGraph[depxc] = depGraph[depxc] || {};
          depGraph[depxc][sheet] = depGraph[depxc][sheet] || new Set();
          depGraph[depxc][sheet].add(xc);
        }
      }
    }
  }

  clearDependency(sheet: string, xc: string) {
    const depList: { [sheet: string]: Set<string> }[] = [this.dependencyGraph[sheet][xc]];
    while (depList.length) {
      const deps = depList.pop();
      for (let sheetName in deps) {
        const depSheet = this.workbook.sheets.find((s) => s.name === sheetName)!;
        for (let xc of deps[sheetName]) {
          const cell = depSheet.cells[xc];
          if (cell && this.upToDate.has(cell)) {
            this.upToDate.delete(cell);
            depList.push(this.dependencyGraph[sheetName][xc]);
          }
        }
      }
    }
  }


}
