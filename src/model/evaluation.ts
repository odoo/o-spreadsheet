import { functionMap } from "../functions/index";
import { Cell, GridState } from "./state";
import { toCartesian, toXC } from "../helpers";

export function evaluateCells(state: GridState) {
  const cells = state.cells;
  const visited = {};
  const functions = Object.assign({ range }, functionMap);

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
    visited[xc] = null;
    try {
      // todo: move formatting in grid and formatters.js
      cell.value = cell.formula(getValue, functions);
      //cell.value = +cell.formula(getValue, functions).toFixed(4);
      cell.error = false;
    } catch (e) {
      cell.value = cell.value || "#ERROR";
      cell.error = true;
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

  for (let xc in cells) {
    computeValue(xc, cells[xc]);
  }
}
