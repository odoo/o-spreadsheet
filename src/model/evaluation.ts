import { functionMap } from "../functions/index";
import { Cell, GridState } from "./state";
import { toCartesian, toXC } from "../helpers";

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

function _evaluateCells(state: GridState, onlyWaiting: boolean) {
  if (!onlyWaiting) {
    COMPUTED.clear();
  }
  const cells = state.cells;
  const visited = {};
  const functions = Object.assign({ range }, functionMap);

  function handleError(e: Error, cell: Cell) {
    PENDING.delete(cell);
    if (e.message === "not ready") {
      WAITING.add(cell);
      cell.value = "#LOADING";
    } else {
      cell.value = cell.value || "#ERROR";
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
        const prom = cell.formula(getValue, functions).then(val => {
          cell.value = val;
          PENDING.delete(cell);
          COMPUTED.add(cell);
          _evaluateCells(state, true);
        }).catch((e: Error) => handleError(e, cell));
        state.asyncComputations.push(prom);
      } else {
        cell.value = cell.formula(getValue, functions);
      }
      //cell.value = +cell.formula(getValue, functions).toFixed(4);
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
    computeValue(xc, cell);
    if (cell.error) {
      throw new Error("boom");
    }
    if (PENDING.has(cell)) {
      throw new Error("not ready");
    }
    return cells[xc].value;
  }

  function range(v1: string, v2: string): any[] {
    const [c1, r1] = toCartesian(v1);
    const [c2, r2] = toCartesian(v2);
    const result: any[] = [];
    for (let c = c1; c <= c2; c++) {
      for (let r = r1; r <= r2; r++) {
        result.push(getValue(toXC(c, r)));
      }
    }
    return result;
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
