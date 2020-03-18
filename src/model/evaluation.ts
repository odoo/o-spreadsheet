import { functionMap } from "../functions/index";
import { toCartesian, toZone } from "../helpers";
import * as entity from "./entity";
import { Cell, Workbook, Sheet, Zone, CellIsRule } from "./types";

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

export function evaluateCells(state: Workbook) {
  state.isStale = false;
  _evaluateCells(state, false);
}

export function _evaluateCells(state: Workbook, onlyWaiting: boolean) {
  const sheets: { [name: string]: Sheet } = {};
  for (let sheet of state.sheets) {
    sheets[sheet.name] = sheet;
  }
  if (!onlyWaiting) {
    COMPUTED.clear();
  }
  const cells = state.cells;
  const visited = {};

  // Evaluation context
  // All functions + entity functions
  const ctx = Object.assign(Object.create(functionMap), {
    getEntity(type: string, key: string): any {
      return entity.getEntity(state, type, key);
    },
    getEntities(type: string): { [key: string]: any } {
      return entity.getEntities(state, type);
    }
  });

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
          .formula(readCell, range, ctx)
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
        cell.value = cell.formula(readCell, range, ctx);
      }
      cell.error = false;
    } catch (e) {
      handleError(e, cell);
    }
    visited[xc] = true;
  }

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

  if (onlyWaiting) {
    const clone: Set<Cell> = new Set(WAITING);
    WAITING.clear();
    for (let cell of clone) {
      computeValue(cell);
    }
  } else {
    for (let xc in cells) {
      const cell = cells[xc];
      computeValue(cell);
    }
  }
  computeStyles(state);
}

let ruleExecutor = {
  CellIsRule: (cell: Cell, rule: CellIsRule): boolean => {
    switch (rule.operator) {
      case "Equal":
        return cell && cell.value == rule.values[0];

      default:
        console.warn(
          `Not implemented operator ${rule.operator} for kind of conditional formatting:  ${rule.kind}`
        );
    }
    return false;
  }
};

/**
 * Compute the styles according to the conditional formatting.
 * This computation must happen after the cell values are computed if they change
 *
 * This result of the computation will be in the state.cell[XC].conditionalStyle and will be the union of all the style
 * properties applied (in order).
 * So if a cell has multiple conditional formatting applied to it, and each affect a different value of the style,
 * the resulting style will have the combination of all those values.
 * If multiple conditional formatting use the same style value, they will be applied in order so that the last applied wins
 */
// TODO: VSC: we might need to create the cells if they are not yet created ?
export function computeStyles(state: Workbook) {
  for (let c of Object.values(state.cells)) {
    c.conditionalStyle = undefined;
  }
  for (let cf of state.activeSheet.conditionalFormats) {
    for (let ref of cf.ranges) {
      const zone: Zone = toZone(ref);
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const rulePredicate = ruleExecutor[cf.formatRule.type.kind];
          const cell = state.rows[row].cells[col];
          if (rulePredicate && rulePredicate(cell, cf.formatRule.type)) {
            cell.conditionalStyle = Object.assign(cell.conditionalStyle || {}, cf.style);
          }
        }
      }
    }
  }
}
