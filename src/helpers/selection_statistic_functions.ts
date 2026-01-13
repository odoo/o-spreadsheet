import { lazy } from "@odoo/o-spreadsheet-engine/helpers/misc";
import { CellValueType, EvaluatedCell, Lazy, Locale } from "../types";

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

export function buildEmptyStatisticFnResults(
  selectionStatisticFunctions: SelectionStatisticFunction[]
): StatisticFnResults {
  const statisticFnResults: StatisticFnResults = {};
  for (const fn of selectionStatisticFunctions) {
    statisticFnResults[fn.name] = undefined;
  }
  return statisticFnResults;
}

export function computeStatisticFnResults(
  selectionStatisticFunctions: SelectionStatisticFunction[],
  cells: EvaluatedCell[],
  locale: Locale
): StatisticFnResults {
  const statisticFnResults: StatisticFnResults = {};
  const getCells = ((typesMap: Record<string, EvaluatedCell[]>) => (typeStr: string) => {
    if (!typesMap[typeStr]) {
      const types = typeStr.split(",");
      typesMap[typeStr] = cells.filter((c) => types.includes(c.type));
    }
    return typesMap[typeStr];
  })({});

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
