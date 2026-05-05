import { CellValueType, EvaluatedCell } from "../types/cells";
import { Format } from "../types/format";
import { Locale } from "../types/locale";
import { Lazy } from "../types/misc";
import { lazy, memoize } from "./misc";

export interface StatisticFnResults {
  [name: string]:
    | {
        value: Lazy<number | string> | undefined;
        format: Lazy<string>;
      }
    | undefined;
}

export interface SelectionStatisticFunction {
  name: string;
  compute: (cells: EvaluatedCell[], locale: Locale) => number | string;
  types: CellValueType[];
  visible?: (cells: EvaluatedCell[], locale: Locale) => boolean;
  computeFormat: (cells: EvaluatedCell[], locale: Locale) => Format;
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
    if (fn.visible && !fn.visible(evaluatedCells, locale)) {
      continue;
    }
    if (evaluatedCells.length) {
      fnResult = lazy(() => fn.compute(evaluatedCells, locale));
    }
    statisticFnResults[fn.name] = {
      value: fnResult,
      format: lazy(() => fn.computeFormat(evaluatedCells, locale) ?? ""),
    };
  }
  return statisticFnResults;
}
