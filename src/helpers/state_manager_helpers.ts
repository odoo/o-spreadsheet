import { HistoryChange } from "../types";

/**
 * Create an empty structure according to the type of the node key:
 * string: object
 * number: array
 */
export function createEmptyStructure(node: string | number | any) {
  if (typeof node === "string") {
    return {};
  } else if (typeof node === "number") {
    return [];
  }
  throw new Error(`Cannot create new node`);
}

/**
 * Apply the changes of the given HistoryChange to the state
 */
export function applyChange(change: HistoryChange, target: "before" | "after") {
  let val = change.root as any;
  let key = change.path[change.path.length - 1];
  for (let pathIndex = 0; pathIndex < change.path.slice(0, -1).length; pathIndex++) {
    const p = change.path[pathIndex];
    if (val[p] === undefined) {
      const nextPath = change.path[pathIndex + 1];
      val[p] = createEmptyStructure(nextPath);
    }
    val = val[p];
  }
  if (change[target] === undefined) {
    delete val[key];
  } else {
    val[key] = change[target];
  }
}
