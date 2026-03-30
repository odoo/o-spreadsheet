import { CellValueType, EvaluatedCell, Lazy, Locale } from "../types";
import { lazy, memoize } from "./misc";

export interface StatisticFnResults {
  [name: string]:
    | {
        value: Lazy<number | string> | undefined;
        format?: string;
      }
    | undefined;
}

export interface SelectionStatisticFunction {
  name: string;
  compute: (data: EvaluatedCell[], locale: Locale) => number | string;
  types: CellValueType[];
  format?: string;
}

export function computeStatisticFnResults(
  selectionStatisticFunctions: SelectionStatisticFunction[],
  cells: EvaluatedCell[],
  locale: Locale
): StatisticFnResults {
  const statisticFnResults: StatisticFnResults = {};
  const getCells = memoize((typeStr: string) => {
    const types = typeStr.split(",");
    return cells.filter((c) => types.includes(c.type));
  });

  for (const fn of selectionStatisticFunctions) {
    let fnResult: Lazy<number | string> | undefined = undefined;
    const evaluatedCells = getCells(fn.types.sort().join(","));
    if (evaluatedCells.length) {
      fnResult = lazy(() => fn.compute(evaluatedCells, locale));
    }
    statisticFnResults[fn.name] = {
      value: fnResult,
      format: fn.format,
    };
  }
  return statisticFnResults;
}
