import { Getters } from "../../types/getters";
import { isMatrix } from "../../types/misc";
import { formatValue } from "../format/format";

export type StatItem = {
  name: string;
  value: string;
  formula: string;
};

export type StatGroup = { label?: string; items: StatItem[] };
export type StatSection = { title: string; range: string; groups: StatGroup[] };

export function item(getters: Getters, sheetId: string, name: string, formula: string): StatItem {
  const locale = getters.getLocale();
  const result = getters.evaluateFormulaResult(sheetId, formula);
  if (!isMatrix(result) && !result.message) {
    const { value, format } = result;
    if (value !== null && value !== undefined) {
      const displayValue =
        typeof value === "number" && !format ? parseFloat(value.toFixed(4)) : value;
      return {
        name,
        value: formatValue(displayValue, { locale, format }),
        formula,
      };
    }
  }
  return { name, value: "—", formula };
}

/** Wraps a raw cell value so it can be spliced into a formula criterion (e.g. `COUNTIF`). */
export function literalForFormula(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
