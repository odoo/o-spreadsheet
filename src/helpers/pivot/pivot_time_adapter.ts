import { toNumber } from "../../functions/helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
import { CellValue, DEFAULT_LOCALE } from "../../types";
import { EvaluationError } from "../../types/errors";
import { Granularity, PivotTimeAdapter, PivotTimeAdapterNotNull } from "../../types/pivot";
import { DAYS, MONTHS, formatValue } from "../format/format";

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
 * normalizes day of week number
 *
 * The day of week is a bit special as it depends on the locale week start day.
 * =PIVOT.VALUE(1, "xx:day_of_week", 1) will be different depending on the locale
 *  - fr_FR: 1: Monday, 7: Sunday   (weekStart = 1)
 *  - en_US: 1: Sunday, 7: Saturday (weekStart = 7)
 *
 * The function that normalizes the value coming from the function
 * (`normalizeFunctionValue`) will return the day of week (1 based index)
 * depending on the locale week start day.
 * To display the value in the pivot, we need to convert it to retrieve the
 * correct day of week name (1 should be "Monday" in fr_FR and "Sunday" in en_US).
 */
const dayOfWeekAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const day = toNumber(value, DEFAULT_LOCALE);
    if (day < 1 || day > 7) {
      throw new EvaluationError(
        _t("%s is not a valid day of week (it should be a number between 1 and 7)", day)
      );
    }
    return day;
  },
  toValueAndFormat(normalizedValue, locale) {
    /**
     * As explain above, normalizedValue is the day of week (1 based index)
     * depending on the locale week start day. To retrieve the correct day name,
     * we need to convert it to a 0 based index with 0 being Sunday. (DAYS is
     * an object of day names with 0 being Sunday)
     */
    const index = (normalizedValue - 1 + (locale || DEFAULT_LOCALE).weekStart) % 7;
    return {
      value: DAYS[index].toString(),
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
      value: _t("Q%(quarter_number)s", { quarter_number: normalizedValue }),
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
 * normalizes hour number
 */
const hourNumberAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const hour = toNumber(value, DEFAULT_LOCALE);
    if (hour < 0 || hour > 23) {
      throw new EvaluationError(
        _t("%s is not a valid hour (it should be a number between 0 and 23)", hour)
      );
    }
    return hour;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: _t("%(hour_number)sh", { hour_number: normalizedValue }),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

/**
 * normalizes hour number
 */
const minuteNumberAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const minute = toNumber(value, DEFAULT_LOCALE);
    if (minute < 0 || minute > 59) {
      throw new EvaluationError(
        _t("%s is not a valid minute (it should be a number between 0 and 59)", minute)
      );
    }
    return minute;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: _t("%(minute_number)s'", { minute_number: normalizedValue }),
      format: "0",
    };
  },
  toFunctionValue(normalizedValue) {
    return `${normalizedValue}`;
  },
};

/**
 * normalizes second number
 */
const secondNumberAdapter: PivotTimeAdapterNotNull<number> = {
  normalizeFunctionValue(value) {
    const second = toNumber(value, DEFAULT_LOCALE);
    if (second < 0 || second > 59) {
      throw new EvaluationError(
        _t("%s is not a valid second (it should be a number between 0 and 59)", second)
      );
    }
    return second;
  },
  toValueAndFormat(normalizedValue) {
    return {
      value: _t("%(second_number)s''", { second_number: normalizedValue }),
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
  .add("quarter_number", nullHandlerDecorator(quarterNumberAdapter))
  .add("day_of_week", nullHandlerDecorator(dayOfWeekAdapter))
  .add("hour_number", nullHandlerDecorator(hourNumberAdapter))
  .add("minute_number", nullHandlerDecorator(minuteNumberAdapter))
  .add("second_number", nullHandlerDecorator(secondNumberAdapter));
