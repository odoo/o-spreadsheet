import { functionMap } from "../functions/index";
import { toCartesian } from "../helpers";
import { Cell, GridState } from "./state";
import * as object from "./object";

/**
 * For all cells that are being currently computed (asynchronously).
 *
 * For example: =Wait(3)
 */
const PENDING: Set<Cell> = new Set();

/**
 * For all cells that are NOT being currently computed, but depend on another
 * asynchronous computation.
 *
 * For example: A2 is in WAITING (initially) and A1 in PENDING
 *   A1: =Wait(3)
 *   A2: =A1
 */
const WAITING: Set<Cell> = new Set();

/**
 * For all cells that have been async computed.
 *
 * For example:
 *  A1: =Wait(3)
 *  A2: =A1
 *
 * When A1 is computed, A1 is moved in COMPUTED
 */
const COMPUTED: Set<Cell> = new Set();

export function evaluateCells(state: GridState) {
  _evaluateCells(state, false);
}

export function _evaluateCells(state: GridState, onlyWaiting: boolean) {
  if (!onlyWaiting) {
    COMPUTED.clear();
  }
  const cells = state.cells;
  const visited = {};
  const functions = Object.assign({ range, getObject, getObjects }, functionMap);

  function handleError(e: Error, cell: Cell) {
    if (PENDING.has(cell)) {
      PENDING.delete(cell);
      state.loadingCells--;
    }
    if (e.message === "not ready") {
      WAITING.add(cell);
      cell.value = "#LOADING";
    } else if (!cell.error) {
      cell.value = "#ERROR";
      cell.error = true;
    }
  }

  function computeValue(xc, cell: Cell) {
    if (cell.type !== "formula" || !cell.formula) {
      return;
    }
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
    try {
      // todo: move formatting in grid and formatters.js
      if (cell.async) {
        cell.value = "#LOADING";
        PENDING.add(cell);
        cell
          .formula(getValue, functions)
          .then(val => {
            cell.value = val;
            state.loadingCells--;
            if (PENDING.has(cell)) {
              PENDING.delete(cell);
              COMPUTED.add(cell);
            }
          })
          .catch((e: Error) => handleError(e, cell));
        state.loadingCells++;
      } else {
        cell.value = cell.formula(getValue, functions);
      }
      cell.error = false;
    } catch (e) {
      handleError(e, cell);
    }
    visited[xc] = true;
  }

  function getValue(xc: string): any {
    const cell = cells[xc];
    if (!cell || cell.content === "") {
      return 0;
    }
    return getCellValue(cell);
  }

  function getCellValue(cell: Cell): any {
    computeValue(cell.xc, cell);
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
  function range(v1: string, v2: string): any[] {
    const [c1, r1] = toCartesian(v1);
    const [c2, r2] = toCartesian(v2);
    const result: any[] = new Array(c2 - c1);
    for (let c = c1; c <= c2; c++) {
      let col: any[] = new Array(r2 - r1);
      result[c - c1] = col;
      for (let r = r1; r <= r2; r++) {
        let cell = state.rows[r].cells[c];
        if (cell) {
          col[r - r1] = getCellValue(cell);
        }
      }
    }
    return result;
  }

  function getObject(type: string, key: string): Object {
    return object.getObject(state, type, key);
  }

  function getObjects(type: string): { [key: string]: Object } {
    return object.getObjects(state, type);
  }

  if (onlyWaiting) {
    const clone: Set<Cell> = new Set(WAITING);
    WAITING.clear();
    for (let cell of clone) {
      computeValue(cell.xc, cell);
    }
  } else {
    for (let xc in cells) {
      computeValue(xc, cells[xc]);
    }
  }
}
