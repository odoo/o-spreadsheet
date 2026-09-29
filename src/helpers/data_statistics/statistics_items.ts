import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "../../constants";
import { Getters } from "../../types/getters";
import { FunctionResultObject, isMatrix, Matrix } from "../../types/misc";
import { DateTime } from "../dates";
import { formatValue } from "../format/format";

export interface StatItem {
  id: string | null;
  name: string;
  formula: string;
}

export interface StatValue extends StatItem {
  value: string;
  percentage?: string;
}

export type DateSections = { year: StatValue[]; month: StatValue[]; day: StatValue[] };

export type DateGranularity = "year" | "month" | "day";

export function getStatIdFromDate(date: DateTime, granularity: DateGranularity): string | null {
  switch (granularity) {
    case "year":
      return getStatIdForYear(date.getFullYear().toString());
    case "month":
      return getStatIdForMonth(date.getMonth());
    case "day":
      return getStatIdForDay(date.getDay());
    default:
      return null;
  }
}

export function getStatIdForYear(year: number | string) {
  return year.toString();
}

export function getStatIdForMonth(month: number | string) {
  return "m" + month.toString();
}

export function getStatIdForDay(day: number | string) {
  return "d" + day.toString();
}

export function createStatItem(
  getters: Getters,
  sheetId: string,
  {
    id,
    name,
    formula,
    computedValue,
    format: targetFormat,
  }: {
    id: string;
    name: string;
    formula: string;
    computedValue?: Matrix<FunctionResultObject> | FunctionResultObject;
    format?: string;
  }
): StatValue {
  const locale = getters.getLocale();
  const result = computedValue ?? getters.evaluateFormulaResult(sheetId, formula);

  if (!isMatrix(result) && !result.message) {
    const { value } = result;
    const format = result.format ?? targetFormat;

    if (value !== null && value !== undefined) {
      const displayValue =
        typeof value === "number" && !format ? parseFloat(value.toFixed(4)) : value;
      return {
        id,
        name,
        value: formatValue(displayValue, { locale, format }),
        formula,
      };
    }
  }
  return { id, name, formula, value: "—" };
}

export function getStatScorecardDefinition(stat: StatItem) {
  return {
    title: { text: stat.name },
    type: "scorecard" as const,
    keyValue: stat.formula,
    humanize: true,
    baselineMode: "text" as const,
    baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
    baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  };
}
