import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "../../constants";
import { Getters } from "../../types/getters";
import { isMatrix } from "../../types/misc";
import { formatValue } from "../format/format";

export interface StatItem {
  id: string | number;
  name: string;
  formula: string;
}

export interface StatValue extends StatItem {
  value: string;
}

export type StatSection = { label?: string; items: StatValue[] };

export function createStatItem(
  getters: Getters,
  sheetId: string,
  id: string | number,
  name: string,
  formula: string
): StatValue {
  const locale = getters.getLocale();
  const result = getters.evaluateFormulaResult(sheetId, formula);
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
      };
    }
  }
  return { id, name, value: "—", formula };
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
