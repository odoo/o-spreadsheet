import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "../../constants";
import { CellValue, CellValueType } from "../../types/cells";
import { Getters } from "../../types/getters";
import { FunctionResultObject, isMatrix, Matrix } from "../../types/misc";
import { DateTime, jsDateToNumber } from "../dates";
import { formatValue } from "../format/format";

export interface StatItem {
  id: string;
  name: string;
  formula: string;
  chartTitle?: string;
}

export interface StatValue extends StatItem {
  value: string;
  percentage?: string;
  rawData?: { type: CellValueType; value: CellValue };
}

export type DateSections = {
  year: StatValue[];
  quarter: StatValue[];
  month: StatValue[];
  week: StatValue[];
  weekday: StatValue[];
  day: StatValue[];
  date: StatValue[];
};

export type DateGranularity = "year" | "quarter" | "month" | "week" | "weekday" | "day" | "date";

export function getStatIdFromDate(date: DateTime, granularity: DateGranularity): string | null {
  switch (granularity) {
    case "year":
      return getStatIdForYear(date.getFullYear().toString());
    case "quarter":
      return getStatIdForQuarter(date.getQuarter());
    case "month":
      return getStatIdForMonth(date.getMonth());
    case "week":
      return getStatIdForWeek(date.getIsoWeek().toString());
    case "weekday":
      return getStatIdForDay(date.getDay());
    case "day":
      return getStatIdForDayOfMonth(date.getDate());
    case "date":
      return Math.floor(jsDateToNumber(date)).toString();
    default:
      throw new Error(`Granularity not supported : ${granularity}`);
  }
}

export function getStatIdForYear(year: number | string) {
  return year.toString();
}

export function getStatIdForQuarter(quarter: number | string) {
  return "q" + quarter.toString();
}

export function getStatIdForMonth(month: number | string) {
  return "m" + month.toString();
}

export function getStatIdForWeek(week: number | string) {
  return week.toString();
}

export function getStatIdForDay(day: number | string) {
  return "d" + day.toString();
}

export function getStatIdForDayOfMonth(day: number | string) {
  return "dom" + day.toString();
}

export function createStatItem(
  getters: Getters,
  sheetId: string,
  {
    id,
    name,
    formula,
    chartTitle,
    computedValue,
  }: StatItem & {
    computedValue?: Matrix<FunctionResultObject> | FunctionResultObject;
  }
): StatValue {
  const locale = getters.getLocale();
  const result = computedValue ?? getters.evaluateFormulaResult(sheetId, formula);
  if (!isMatrix(result) && !result.message) {
    const { value, format } = result;
    if (value !== null && value !== undefined) {
      const displayValue =
        typeof value === "number" && !format ? parseFloat(value.toFixed(4)) : value;
      return {
        id,
        name,
        value: formatValue(displayValue, { locale, format }),
        formula,
        chartTitle,
      };
    }
  }
  return { id, name, formula, chartTitle, value: "—" };
}

export function getStatScorecardDefinition(stat: StatItem) {
  return {
    title: { text: stat.chartTitle ?? stat.name },
    type: "scorecard" as const,
    keyValue: stat.formula,
    humanize: true,
    baselineMode: "text" as const,
    baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
    baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  };
}
