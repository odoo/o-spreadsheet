import { toNumber } from "../../functions/helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
import { DEFAULT_LOCALE } from "../../types";
import { Granularity, PivotTimeAdapter } from "../../types/pivot";
import { formatValue } from "../format";

export const pivotTimeAdapterRegistry = new Registry<PivotTimeAdapter<string | number | false>>();

export function pivotTimeAdapter(
  granularity: Granularity
): PivotTimeAdapter<string | number | false> {
  return pivotTimeAdapterRegistry.get(granularity);
}

/**
 * The Time Adapter: Managing Time Periods for Pivot Functions
 *
 * Overview:
 * A time adapter is responsible for managing time periods associated with pivot functions.
 * Each type of period (day, week, month, quarter, etc.) has its own dedicated adapter.
 * The adapter's primary role is to normalize period values between spreadsheet functions,
 * and the pivot.
 * By normalizing the period value, it can be stored consistently in the pivot.
 *
 * Normalization Process:
 * When working with functions in the spreadsheet, the time adapter normalizes
 * the provided period to facilitate accurate lookup of values in the pivot.
 * For instance, if the spreadsheet function represents a day period as a number generated
 * by the DATE function (DATE(2023, 12, 25)), the time adapter will normalize it accordingly.
 *
 */

/**
 * Normalized value: "12/25/2023"
 *
 * Note: Those two format are equivalent:
 * - "MM/dd/yyyy" (luxon format)
 * - "mm/dd/yyyy" (spreadsheet format)
 **/
const dayAdapter: PivotTimeAdapter<string> = {
  normalizeFunctionValue(value) {
    const date = toNumber(value, DEFAULT_LOCALE);
    return formatValue(date, { locale: DEFAULT_LOCALE, format: "mm/dd/yyyy" });
  },
  getFormat(locale) {
    return (locale ?? DEFAULT_LOCALE).dateFormat;
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    const value = toNumber(normalizedValue, DEFAULT_LOCALE);
    return formatValue(value, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return toNumber(normalizedValue, DEFAULT_LOCALE);
  },
};

/**
 * Normalized value: "2/2023" for week 2 of 2023
 */
const weekAdapter: PivotTimeAdapter<string> = {
  normalizeFunctionValue(value) {
    const [week, year] = value.split("/");
    return `${Number(week)}/${Number(year)}`;
  },
  getFormat() {
    return undefined;
  },
  formatValue(normalizedValue) {
    const [week, year] = normalizedValue.split("/");
    return _t("W%(week)s %(year)s", { week, year });
  },
  toCellValue(normalizedValue) {
    return this.formatValue(normalizedValue);
  },
};

/**
 * normalized month value is a string formatted as "MM/yyyy" (luxon format)
 * e.g. "01/2020" for January 2020
 */
const monthAdapter: PivotTimeAdapter<string> = {
  normalizeFunctionValue(value) {
    const date = toNumber(value, DEFAULT_LOCALE);
    return formatValue(date, { locale: DEFAULT_LOCALE, format: "mm/yyyy" });
  },
  getFormat() {
    return "mmmm yyyy";
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    const value = toNumber(normalizedValue, DEFAULT_LOCALE);
    return formatValue(value, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return toNumber(normalizedValue, DEFAULT_LOCALE);
  },
};

/**
 * normalized quarter value is "quarter/year"
 * e.g. "1/2020" for Q1 2020
 */
const quarterAdapter: PivotTimeAdapter<string> = {
  normalizeFunctionValue(value) {
    const [quarter, year] = value.split("/");
    return `${quarter}/${year}`;
  },
  getFormat() {
    return undefined;
  },
  formatValue(normalizedValue) {
    const [quarter, year] = normalizedValue.split("/");
    return _t("Q%(quarter)s %(year)s", { quarter, year });
  },
  toCellValue(normalizedValue) {
    return this.formatValue(normalizedValue);
  },
};

const yearAdapter: PivotTimeAdapter<number> = {
  normalizeFunctionValue(value) {
    return toNumber(value, DEFAULT_LOCALE);
  },
  getFormat() {
    return "0";
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    return formatValue(normalizedValue, { locale, format: "0" });
  },
  toCellValue(normalizedValue) {
    return normalizedValue;
  },
};

pivotTimeAdapterRegistry
  .add("day", dayAdapter)
  .add("week", weekAdapter)
  .add("month", monthAdapter)
  .add("quarter", quarterAdapter)
  .add("year", yearAdapter);
