import { toNumber } from "../../functions/helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
import { CellValue, DEFAULT_LOCALE } from "../../types";
import { EvaluationError } from "../../types/errors";
import { Granularity, PivotTimeAdapter } from "../../types/pivot";
import { MONTHS, formatValue } from "../format";

export const pivotTimeAdapterRegistry = new Registry<PivotTimeAdapter<CellValue>>();

export function pivotTimeAdapter(granularity: Granularity): PivotTimeAdapter<CellValue> {
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
const dayAdapter: PivotTimeAdapter<number> = {
  normalizeFunctionValue(value) {
    return toNumber(value, DEFAULT_LOCALE);
  },
  getFormat(locale) {
    return (locale ?? DEFAULT_LOCALE).dateFormat;
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    return formatValue(normalizedValue, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return normalizedValue;
  },
};

/**
 * normalizes day of month number
 */
const dayOfMonthAdapter: PivotTimeAdapter<number> = {
  normalizeFunctionValue(value) {
    const day = toNumber(value, DEFAULT_LOCALE);
    if (day < 1 || day > 31) {
      throw new EvaluationError(
        _t("%s is not a valid day of month (it should be a number between 1 and 31)", day)
      );
    }
    return day;
  },
  getFormat() {
    return "0";
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    return formatValue(normalizedValue, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return normalizedValue;
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
 * normalizes iso week number
 */
const isoWeekNumberAdapter: PivotTimeAdapter<number> = {
  normalizeFunctionValue(value) {
    const isoWeek = toNumber(value, DEFAULT_LOCALE);
    if (isoWeek < 0 || isoWeek > 53) {
      throw new EvaluationError(
        _t("%s is not a valid week (it should be a number between 0 and 53)", isoWeek)
      );
    }
    return isoWeek;
  },
  getFormat() {
    return "0";
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    return formatValue(normalizedValue, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return normalizedValue;
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
 * normalizes month number
 */
const monthNumberAdapter: PivotTimeAdapter<number> = {
  normalizeFunctionValue(value) {
    const month = toNumber(value, DEFAULT_LOCALE);
    if (month < 1 || month > 12) {
      throw new EvaluationError(
        _t("%s is not a valid month (it should be a number between 1 and 12)", month)
      );
    }
    return month;
  },
  getFormat() {
    return "0";
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    return formatValue(normalizedValue, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return MONTHS[toNumber(normalizedValue, DEFAULT_LOCALE) - 1].toString();
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

/**
 * normalizes quarter number
 */
const quarterNumberAdapter: PivotTimeAdapter<number> = {
  normalizeFunctionValue(value) {
    const quarter = toNumber(value, DEFAULT_LOCALE);
    if (quarter < 1 || quarter > 4) {
      throw new EvaluationError(
        _t("%s is not a valid quarter (it should be a number between 1 and 4)", quarter)
      );
    }
    return quarter;
  },
  getFormat() {
    return "0";
  },
  formatValue(normalizedValue, locale) {
    locale = locale ?? DEFAULT_LOCALE;
    return formatValue(normalizedValue, { locale, format: this.getFormat(locale) });
  },
  toCellValue(normalizedValue) {
    return normalizedValue;
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
  .add("year", yearAdapter)
  .add("day_of_month", dayOfMonthAdapter)
  .add("iso_week_number", isoWeekNumberAdapter)
  .add("month_number", monthNumberAdapter)
  .add("quarter_number", quarterNumberAdapter)
  .add("year_number", yearAdapter);
