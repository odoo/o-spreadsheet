import { toNumber } from "../../functions/helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
import { CellValue, DEFAULT_LOCALE } from "../../types";
import { EvaluationError } from "../../types/errors";
import { Granularity, PivotTimeAdapter, PivotTimeAdapterNotNull } from "../../types/pivot";
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
const dayAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    return toNumber(value, DEFAULT_LOCALE);
  },
  toValueAndFormat(normalizedValue, locale) {
    return {
      value: toNumber(normalizedValue, DEFAULT_LOCALE),
      format: (locale ?? DEFAULT_LOCALE).dateFormat,
    };
  },
  toFunctionValue(normalizedValue) {
    const date = toNumber(normalizedValue, DEFAULT_LOCALE);
    return `"${formatValue(date, { locale: DEFAULT_LOCALE, format: "mm/dd/yyyy" })}"`;
  },
};

/**
 * normalizes day of month number
 */
const dayOfMonthAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const day = toNumber(value, DEFAULT_LOCALE);
    if (day < 1 || day > 31) {
      throw new EvaluationError(
        _t("%s is not a valid day of month (it should be a number between 1 and 31)", day)
      );
    }
    return day;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: toNumber(normalizedValue, DEFAULT_LOCALE),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

/**
 * normalizes iso week number
 */
const isoWeekNumberAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const isoWeek = toNumber(value, DEFAULT_LOCALE);
    if (isoWeek < 0 || isoWeek > 53) {
      throw new EvaluationError(
        _t("%s is not a valid week (it should be a number between 0 and 53)", isoWeek)
      );
    }
    return isoWeek;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: toNumber(normalizedValue, DEFAULT_LOCALE),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

/**
 * normalizes month number
 */
const monthNumberAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const month = toNumber(value, DEFAULT_LOCALE);
    if (month < 1 || month > 12) {
      throw new EvaluationError(
        _t("%s is not a valid month (it should be a number between 1 and 12)", month)
      );
    }
    return month;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: MONTHS[toNumber(normalizedValue, DEFAULT_LOCALE) - 1].toString(),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

/**
 * normalizes quarter number
 */
const quarterNumberAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const quarter = toNumber(value, DEFAULT_LOCALE);
    if (quarter < 1 || quarter > 4) {
      throw new EvaluationError(
        _t("%s is not a valid quarter (it should be a number between 1 and 4)", quarter)
      );
    }
    return quarter;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: toNumber(normalizedValue, DEFAULT_LOCALE),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

const yearAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    return toNumber(value, DEFAULT_LOCALE);
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: toNumber(normalizedValue, DEFAULT_LOCALE),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

/**
 * This function takes an adapter and wraps it with a null handler.
 * null value means that the value is not set.
 */
function nullHandlerDecorator<T>(adapter: PivotTimeAdapterNotNull<T>): PivotTimeAdapter<T> {
  return {
    normalizeFunctionValue(value) {
      if (value === null) {
        return null;
      }
      return adapter.normalizeFunctionValue(value);
    },
    toValueAndFormat(normalizedValue, locale) {
      if (normalizedValue === null) {
        return { value: _t("(Undefined)") }; //TODO Return NA ?
      }
      return adapter.toValueAndFormat(normalizedValue, locale);
    },
    toFunctionValue(normalizedValue) {
      if (normalizedValue === null) {
        return "false"; //TODO Return NA ?
      }
      return adapter.toFunctionValue(normalizedValue);
    },
  };
}

pivotTimeAdapterRegistry
  .add("day", nullHandlerDecorator(dayAdapter))
  .add("year", nullHandlerDecorator(yearAdapter))
  .add("day_of_month", nullHandlerDecorator(dayOfMonthAdapter))
  .add("iso_week_number", nullHandlerDecorator(isoWeekNumberAdapter))
  .add("month_number", nullHandlerDecorator(monthNumberAdapter))
  .add("quarter_number", nullHandlerDecorator(quarterNumberAdapter));
