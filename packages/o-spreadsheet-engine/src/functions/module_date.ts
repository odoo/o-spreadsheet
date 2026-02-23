import {
  addMonthsToDate,
  areTwoDatesWithinOneYear,
  DateTime,
  getDaysInMonth,
  getTimeDifferenceInWholeDays,
  getTimeDifferenceInWholeMonths,
  getTimeDifferenceInWholeYears,
  getYearFrac,
  INITIAL_1900_DAY,
  jsDateToRoundNumber,
  MS_PER_DAY,
  numberToJsDate,
  parseDateTime,
} from "../helpers/dates";
import { getDateTimeFormat } from "../helpers/locale";
import { _t } from "../translation";
import { EvaluationError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { assert } from "./helper_assert";
import { DAY_COUNT_CONVENTION_OPTIONS } from "./helper_financial";
import { expectStringSetError, toBoolean, toJsDate, toNumber, toString, visitAny } from "./helpers";

const DEFAULT_TYPE = 1;
const DEFAULT_WEEKEND = 1;
enum TIME_UNIT {
  WHOLE_YEARS = "Y",
  WHOLE_MONTHS = "M",
  WHOLE_DAYS = "D",
  DAYS_WITHOUT_WHOLE_MONTHS = "MD",
  MONTH_WITHOUT_WHOLE_YEARS = "YM",
  DAYS_BETWEEN_NO_MORE_THAN_ONE_YEAR = "YD",
}

// -----------------------------------------------------------------------------
// DATE
// -----------------------------------------------------------------------------
export const DATE = {
  description: _t("Converts year/month/day into a date."),
  args: [
    arg("year (number)", _t("The year component of the date.")),
    arg("month (number)", _t("The month component of the date.")),
    arg("day (number)", _t("The day component of the date.")),
  ],
  compute: function (
    year: Maybe<FunctionResultObject>,
    month: Maybe<FunctionResultObject>,
    day: Maybe<FunctionResultObject>
  ) {
    let _year = Math.trunc(toNumber(year, this.locale));
    const _month = Math.trunc(toNumber(month, this.locale));
    const _day = Math.trunc(toNumber(day, this.locale));

    // For years less than 0 or greater than 10000, return #ERROR.
    if (_year < 0 || _year > 9999) {
      return new EvaluationError(
        _t("The year (%s) must be between 0 and 9999 inclusive.", _year.toString())
      );
    }

    // Between 0 and 1899, we add that value to 1900 to calculate the year
    if (_year < 1900) {
      _year += 1900;
    }

    const jsDate = new DateTime(_year, _month - 1, _day);
    const result = jsDateToRoundNumber(jsDate);

    if (result < 0) {
      return new EvaluationError(
        _t("The function [[FUNCTION_NAME]] result must be greater than or equal 01/01/1900.")
      );
    }

    return {
      value: result,
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DATEDIF
// -----------------------------------------------------------------------------
function datedif(startDate: number, endDate: number, unit: TIME_UNIT): number {
  const jsStartDate = numberToJsDate(startDate);
  const jsEndDate = numberToJsDate(endDate);

  if (endDate < startDate) {
    throw new EvaluationError(
      _t(
        "start_date (%s) should be on or before end_date (%s).",
        jsStartDate.toLocaleDateString(),
        jsEndDate.toLocaleDateString()
      )
    );
  }

  switch (unit) {
    case TIME_UNIT.WHOLE_YEARS:
      return getTimeDifferenceInWholeYears(jsStartDate, jsEndDate);
    case TIME_UNIT.WHOLE_MONTHS:
      return getTimeDifferenceInWholeMonths(jsStartDate, jsEndDate);
    case TIME_UNIT.WHOLE_DAYS: {
      return getTimeDifferenceInWholeDays(jsStartDate, jsEndDate);
    }
    case TIME_UNIT.MONTH_WITHOUT_WHOLE_YEARS: {
      return (
        getTimeDifferenceInWholeMonths(jsStartDate, jsEndDate) -
        getTimeDifferenceInWholeYears(jsStartDate, jsEndDate) * 12
      );
    }
    case TIME_UNIT.DAYS_WITHOUT_WHOLE_MONTHS:
      // Using "MD" may get incorrect result in Excel
      // See: https://support.microsoft.com/en-us/office/datedif-function-25dba1a4-2812-480b-84dd-8b32a451b35c
      let days = jsEndDate.getDate() - jsStartDate.getDate();
      if (days < 0) {
        const monthBeforeEndMonth = new DateTime(
          jsEndDate.getFullYear(),
          jsEndDate.getMonth() - 1,
          1
        );
        const daysInMonthBeforeEndMonth = getDaysInMonth(monthBeforeEndMonth);
        days = daysInMonthBeforeEndMonth - Math.abs(days);
      }
      return days;
    case TIME_UNIT.DAYS_BETWEEN_NO_MORE_THAN_ONE_YEAR: {
      if (areTwoDatesWithinOneYear(startDate, endDate)) {
        return getTimeDifferenceInWholeDays(jsStartDate, jsEndDate);
      }
      const endDateWithinOneYear = new DateTime(
        jsStartDate.getFullYear(),
        jsEndDate.getMonth(),
        jsEndDate.getDate()
      );
      let days = getTimeDifferenceInWholeDays(jsStartDate, endDateWithinOneYear);
      if (days < 0) {
        endDateWithinOneYear.setFullYear(jsStartDate.getFullYear() + 1);
        days = getTimeDifferenceInWholeDays(jsStartDate, endDateWithinOneYear);
      }
      return days;
    }
  }
}

export const DATEDIF = {
  description: _t("Calculates the number of days, months, or years between two dates."),
  args: [
    arg(
      "start_date (date)",
      _t(
        "The start date to consider in the calculation. Must be a reference to a cell containing a DATE, a function returning a DATE type, or a number."
      )
    ),
    arg(
      "end_date (date)",
      _t(
        "The end date to consider in the calculation. Must be a reference to a cell containing a DATE, a function returning a DATE type, or a number."
      )
    ),
    arg("unit (string)", _t("A text abbreviation for unit of time."), [
      { value: "Y", label: _t("The number of whole years between start_date and end_date") },
      { value: "M", label: _t("The number of whole months between start_date and end_date") },
      { value: "D", label: _t("The number of days between start_date and end_date") },
      {
        value: "MD",
        label: _t(
          "The number of days between start_date and end_date after subtracting whole months"
        ),
      },
      {
        value: "YM",
        label: _t(
          "The number of whole months between start_date and end_date after subtracting whole years"
        ),
      },
      {
        value: "YD",
        label: _t(
          "The number of days between start_date and end_date, assuming start_date and end_date were no more than one year apart"
        ),
      },
    ]),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    endDate: Maybe<FunctionResultObject>,
    unit: Maybe<FunctionResultObject>
  ) {
    const _unit = toString(unit).toUpperCase() as TIME_UNIT;
    if (!Object.values(TIME_UNIT).includes(_unit)) {
      return new EvaluationError(expectStringSetError(Object.values(TIME_UNIT), toString(unit)));
    }
    const _startDate = Math.trunc(toNumber(startDate, this.locale));
    const _endDate = Math.trunc(toNumber(endDate, this.locale));
    return { value: datedif(_startDate, _endDate, _unit) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DATEVALUE
// -----------------------------------------------------------------------------
export const DATEVALUE = {
  description: _t("Converts a date string to a date value."),
  args: [arg("date_string (string)", _t("The string representing the date."))],
  compute: function (dateString: Maybe<FunctionResultObject>) {
    const _dateString = toString(dateString);
    const internalDate = parseDateTime(_dateString, this.locale);

    if (internalDate === null) {
      return new EvaluationError(
        _t("The date_string (%s) cannot be parsed to date/time.", _dateString.toString())
      );
    }

    return { value: Math.trunc(internalDate!.value) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DAY
// -----------------------------------------------------------------------------
export const DAY = {
  description: _t("Day of the month that a specific date falls on."),
  args: [arg("date (string)", _t("The date from which to extract the day."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: toJsDate(date, this.locale).getDate() };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DAYS
// -----------------------------------------------------------------------------

export const DAYS = {
  description: _t("Number of days between two dates."),
  args: [
    arg("end_date (date)", _t("The end of the date range.")),
    arg("start_date (date)", _t("The start of the date range.")),
  ],
  compute: function (endDate: Maybe<FunctionResultObject>, startDate: Maybe<FunctionResultObject>) {
    const _endDate = toJsDate(endDate, this.locale);
    const _startDate = toJsDate(startDate, this.locale);
    const dateDif = _endDate.getTime() - _startDate.getTime();
    return { value: Math.round(dateDif / MS_PER_DAY) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DAYS360
// -----------------------------------------------------------------------------
const DEFAULT_DAY_COUNT_METHOD = false;
export const DAYS360 = {
  description: _t("Number of days between two dates on a 360-day year (months of 30 days)."),
  args: [
    arg("start_date (date)", _t("The start date to consider in the calculation.")),
    arg("end_date (date)", _t("The end date to consider in the calculation.")),
    arg(
      `method (boolean, default=${DEFAULT_DAY_COUNT_METHOD})`,
      _t("An indicator of what day count method to use."),
      [
        { value: false, label: _t("U.S. NASD method (default)") },
        { value: true, label: _t("European method") },
      ]
    ),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    endDate: Maybe<FunctionResultObject>,
    method: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_METHOD }
  ) {
    const _startDate = Math.trunc(toNumber(startDate, this.locale));
    const _endDate = Math.trunc(toNumber(endDate, this.locale));
    const dayCountConvention = toBoolean(method) ? 4 : 0;

    const yearFrac = getYearFrac(_startDate, _endDate, dayCountConvention);
    return { value: Math.sign(_endDate - _startDate) * Math.round(yearFrac * 360) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EDATE
// -----------------------------------------------------------------------------
export const EDATE = {
  description: _t("Date a number of months before/after another date."),
  args: [
    arg("start_date (date)", _t("The date from which to calculate the result.")),
    arg(
      "months (number)",
      _t("The number of months before (negative) or after (positive) 'start_date' to calculate.")
    ),
  ],
  compute: function (startDate: Maybe<FunctionResultObject>, months: Maybe<FunctionResultObject>) {
    const _startDate = toJsDate(startDate, this.locale);
    const _months = Math.trunc(toNumber(months, this.locale));

    const jsDate = addMonthsToDate(_startDate, _months, false);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EOMONTH
// -----------------------------------------------------------------------------
export const EOMONTH = {
  description: _t("Last day of a month before or after a date."),
  args: [
    arg("start_date (date)", _t("The date from which to calculate the result.")),
    arg(
      "months (number)",
      _t("The number of months before (negative) or after (positive) 'start_date' to consider.")
    ),
  ],
  compute: function (startDate: Maybe<FunctionResultObject>, months: Maybe<FunctionResultObject>) {
    const _startDate = toJsDate(startDate, this.locale);
    const _months = Math.trunc(toNumber(months, this.locale));

    const yStart = _startDate.getFullYear();
    const mStart = _startDate.getMonth();
    const jsDate = new DateTime(yStart, mStart + _months + 1, 0);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// HOUR
// -----------------------------------------------------------------------------
export const HOUR = {
  description: _t("Hour component of a specific time."),
  args: [arg("time (date)", _t("The time from which to calculate the hour component."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: toJsDate(date, this.locale).getHours() };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISOWEEKNUM
// -----------------------------------------------------------------------------
export const ISOWEEKNUM = {
  description: _t("ISO week number of the year."),
  args: [
    arg(
      "date (date)",
      _t(
        "The date for which to determine the ISO week number. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
  ],
  compute: function (date: Maybe<FunctionResultObject>) {
    const _date = toJsDate(date, this.locale);
    const y = _date.getFullYear();

    // 1 - As the 1st week of a year can start the previous year or after the 1st
    // january we first look if the date is in the weeks of the current year, previous
    // year or year after.

    // A - We look for the current year, the first days of the first week
    // and the last days of the last week

    // The first week of the year is the week that contains the first
    // Thursday of the year.

    let firstThursday = 1;
    while (new DateTime(y, 0, firstThursday).getDay() !== 4) {
      firstThursday += 1;
    }
    const firstDayOfFirstWeek = new DateTime(y, 0, firstThursday - 3);

    // The last week of the year is the week that contains the last Thursday of
    // the year.

    let lastThursday = 31;
    while (new DateTime(y, 11, lastThursday).getDay() !== 4) {
      lastThursday -= 1;
    }
    const lastDayOfLastWeek = new DateTime(y, 11, lastThursday + 3);

    // B - If our date > lastDayOfLastWeek then it's in the weeks of the year after
    // If our date < firstDayOfFirstWeek then it's in the weeks of the year before

    let offsetYear: number;
    if (firstDayOfFirstWeek.getTime() <= _date.getTime()) {
      if (_date.getTime() <= lastDayOfLastWeek.getTime()) {
        offsetYear = 0;
      } else {
        offsetYear = 1;
      }
    } else {
      offsetYear = -1;
    }

    // 2 - now that the year is known, we are looking at the difference between
    // the first day of this year and the date. The difference in days divided by
    // 7 gives us the week number

    let firstDay: DateTime;
    switch (offsetYear) {
      case 0:
        firstDay = firstDayOfFirstWeek;
        break;
      case 1:
        // firstDay is the 1st day of the 1st week of the year after
        // firstDay = lastDayOfLastWeek + 1 Day
        firstDay = new DateTime(y, 11, lastThursday + 3 + 1);
        break;
      case -1:
        // firstDay is the 1st day of the 1st week of the previous year.
        // The first week of the previous year is the week that contains the
        // first Thursday of the previous year.
        let firstThursdayPreviousYear = 1;
        while (new DateTime(y - 1, 0, firstThursdayPreviousYear).getDay() !== 4) {
          firstThursdayPreviousYear += 1;
        }
        firstDay = new DateTime(y - 1, 0, firstThursdayPreviousYear - 3);
        break;
    }

    const diff = (_date.getTime() - firstDay!.getTime()) / MS_PER_DAY;
    return { value: Math.floor(diff / 7) + 1 };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MINUTE
// -----------------------------------------------------------------------------
export const MINUTE = {
  description: _t("Minute component of a specific time."),
  args: [arg("time (date)", _t("The time from which to calculate the minute component."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: toJsDate(date, this.locale).getMinutes() };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MONTH
// -----------------------------------------------------------------------------
export const MONTH = {
  description: _t("Month of the year a specific date falls in"),
  args: [arg("date (date)", _t("The date from which to extract the month."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: toJsDate(date, this.locale).getMonth() + 1 };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NETWORKDAYS
// -----------------------------------------------------------------------------
export const NETWORKDAYS = {
  description: _t("Net working days between two provided days."),
  args: [
    arg(
      "start_date (date)",
      _t("The start date of the period from which to calculate the number of net working days.")
    ),
    arg(
      "end_date (date)",
      _t("The end date of the period from which to calculate the number of net working days.")
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _t("A range or array constant containing the date serial numbers to consider holidays.")
    ),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    endDate: Maybe<FunctionResultObject>,
    holidays: Arg
  ) {
    return NETWORKDAYS_INTL.compute.bind(this)(startDate, endDate, { value: 1 }, holidays);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NETWORKDAYS.INTL
// -----------------------------------------------------------------------------

/**
 * Transform weekend Spreadsheet information into Date Day JavaScript information.
 * Take string (String method) or number (Number method), return array of numbers.
 *
 * String method: weekends can be specified using seven 0’s and 1’s, where the
 * first number in the set represents Monday and the last number is for Sunday.
 * A zero means that the day is a work day, a 1 means that the day is a weekend.
 * For example, “0000011” would mean Saturday and Sunday are weekends.
 *
 * Number method: instead of using the string method above, a single number can
 * be used. 1 = Saturday/Sunday are weekends, 2 = Sunday/Monday, and this pattern
 * repeats until 7 = Friday/Saturday. 11 = Sunday is the only weekend, 12 = Monday
 * is the only weekend, and this pattern repeats until 17 = Saturday is the only
 * weekend.
 *
 * Example:
 * - 11 return [0] (correspond to Sunday)
 * - 12 return [1] (correspond to Monday)
 * - 3 return [1,2] (correspond to Monday and Tuesday)
 * - "0101010" return [2,4,6] (correspond to Tuesday, Thursday and Saturday)
 */
function weekendToDayNumber(data: Maybe<FunctionResultObject>): number[] {
  const weekend = data?.value;
  // case "string"
  if (typeof weekend === "string") {
    assert(
      weekend.length === 7 && [...weekend].every((c) => c === "0" || c === "1"),
      _t('When weekend is a string (%s) it must be composed of "0" or "1".', weekend)
    );

    const result: number[] = [];
    for (let i = 0; i < 7; i++) {
      if (weekend[i] === "1") {
        result.push((i + 1) % 7);
      }
    }

    return result;
  }

  //case "number"
  if (typeof weekend === "number") {
    assert(
      (1 <= weekend && weekend <= 7) || (11 <= weekend && weekend <= 17),
      _t(
        "The weekend (%s) must be a string or a number in the range 1-7 or 11-17.",
        weekend.toString()
      )
    );

    // case 1 <= weekend <= 7
    if (weekend <= 7) {
      // 1 = Saturday/Sunday are weekends
      // 2 = Sunday/Monday
      // ...
      // 7 = Friday/Saturday.
      return [weekend - 2 === -1 ? 6 : weekend - 2, weekend - 1];
    }

    // case 11 <= weekend <= 17
    // 11 = Sunday is the only weekend
    // 12 = Monday is the only weekend
    // ...
    // 17 = Saturday is the only weekend.
    return [weekend - 11];
  }

  throw new EvaluationError(_t("The weekend must be a number or a string."));
}

const WEEKEND_OPTIONS = [
  { value: 1, label: _t("Saturday/Sunday are weekends") },
  { value: 2, label: _t("Sunday/Monday are weekends") },
  { value: 3, label: _t("Monday/Tuesday are weekends") },
  { value: 4, label: _t("Tuesday/Wednesday are weekends") },
  { value: 5, label: _t("Wednesday/Thursday are weekends") },
  { value: 6, label: _t("Thursday/Friday are weekends") },
  { value: 7, label: _t("Friday/Saturday are weekends") },
  { value: 11, label: _t("Sunday is the only weekend") },
  { value: 12, label: _t("Monday is the only weekend") },
  { value: 13, label: _t("Tuesday is the only weekend") },
  { value: 14, label: _t("Wednesday is the only weekend") },
  { value: 15, label: _t("Thursday is the only weekend") },
  { value: 16, label: _t("Friday is the only weekend") },
  { value: 17, label: _t("Saturday is the only weekend") },
];

export const NETWORKDAYS_INTL = {
  description: _t("Net working days between two dates (specifying weekends)."),
  args: [
    arg(
      "start_date (date)",
      _t("The start date of the period from which to calculate the number of net working days.")
    ),
    arg(
      "end_date (date)",
      _t("The end date of the period from which to calculate the number of net working days.")
    ),
    arg(
      `weekend (any, default=${DEFAULT_WEEKEND})`,
      _t("A number or string representing which days of the week are considered weekends."),
      WEEKEND_OPTIONS
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _t("A range or array constant containing the dates to consider as holidays.")
    ),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    endDate: Maybe<FunctionResultObject>,
    weekend: Maybe<FunctionResultObject> = { value: DEFAULT_WEEKEND },
    holidays: Arg
  ) {
    const _startDate = toJsDate(startDate, this.locale);
    const _endDate = toJsDate(endDate, this.locale);
    const daysWeekend = weekendToDayNumber(weekend);
    const timesHoliday = new Set();
    if (holidays !== undefined) {
      visitAny([holidays], (h) => {
        const holiday = toJsDate(h, this.locale);
        timesHoliday.add(holiday.getTime());
      });
    }

    const invertDate = _startDate.getTime() > _endDate.getTime();
    const stopDate = DateTime.fromTimestamp((invertDate ? _startDate : _endDate).getTime());
    const stepDate = DateTime.fromTimestamp((invertDate ? _endDate : _startDate).getTime());
    const timeStopDate = stopDate.getTime();
    let timeStepDate = stepDate.getTime();

    let netWorkingDay = 0;

    while (timeStepDate <= timeStopDate) {
      if (!daysWeekend.includes(stepDate.getDay()) && !timesHoliday.has(timeStepDate)) {
        netWorkingDay += 1;
      }
      stepDate.setDate(stepDate.getDate() + 1);
      timeStepDate = stepDate.getTime();
    }

    return { value: invertDate ? -netWorkingDay : netWorkingDay };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NOW
// -----------------------------------------------------------------------------

export const NOW = {
  description: _t("Current date and time as a date value."),
  args: [],
  compute: function () {
    const today = DateTime.now();
    const delta = today.getTime() - INITIAL_1900_DAY.getTime();
    const time = today.getHours() / 24 + today.getMinutes() / 1440 + today.getSeconds() / 86400;
    return {
      value: Math.floor(delta / MS_PER_DAY) + time,
      format: getDateTimeFormat(this.locale),
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SECOND
// -----------------------------------------------------------------------------
export const SECOND = {
  description: _t("Minute component of a specific time."),
  args: [arg("time (date)", _t("The time from which to calculate the second component."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: toJsDate(date, this.locale).getSeconds() };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TIME
// -----------------------------------------------------------------------------
export const TIME = {
  description: _t("Converts hour/minute/second into a time."),
  args: [
    arg("hour (number)", _t("The hour component of the time.")),
    arg("minute (number)", _t("The minute component of the time.")),
    arg("second (number)", _t("The second component of the time.")),
  ],
  compute: function (
    hour: Maybe<FunctionResultObject>,
    minute: Maybe<FunctionResultObject>,
    second: Maybe<FunctionResultObject>
  ) {
    let _hour = Math.trunc(toNumber(hour, this.locale));
    let _minute = Math.trunc(toNumber(minute, this.locale));
    let _second = Math.trunc(toNumber(second, this.locale));

    _minute += Math.floor(_second / 60);
    _second = (_second % 60) + (_second < 0 ? 60 : 0);

    _hour += Math.floor(_minute / 60);
    _minute = (_minute % 60) + (_minute < 0 ? 60 : 0);

    _hour %= 24;

    if (_hour < 0) {
      return new EvaluationError(_t("The function [[FUNCTION_NAME]] result cannot be negative"));
    }

    return {
      value: _hour / 24 + _minute / (24 * 60) + _second / (24 * 60 * 60),
      format: this.locale.timeFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TIMEVALUE
// -----------------------------------------------------------------------------
export const TIMEVALUE = {
  description: _t("Converts a time string into its serial number representation."),
  args: [arg("time_string (string)", _t("The string that holds the time representation."))],
  compute: function (timeString: Maybe<FunctionResultObject>) {
    const _timeString = toString(timeString);
    const internalDate = parseDateTime(_timeString, this.locale);

    if (internalDate === null) {
      return new EvaluationError(
        _t("The time_string (%s) cannot be parsed to date/time.", _timeString)
      );
    }
    const result = internalDate!.value - Math.trunc(internalDate!.value);

    return { value: result < 0 ? 1 + result : result };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TODAY
// -----------------------------------------------------------------------------
export const TODAY = {
  description: _t("Current date as a date value."),
  args: [],
  compute: function () {
    const today = DateTime.now();
    const jsDate = new DateTime(today.getFullYear(), today.getMonth(), today.getDate());
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// WEEKDAY
// -----------------------------------------------------------------------------
function weekDayCalc(m: number, type: number): number {
  if (!(1 <= type && type <= 3) && !(11 <= type && type <= 17)) {
    throw new EvaluationError(
      _t("The type (%s) must be between 1 and 3 or between 11 and 17.", type)
    );
  }
  switch (type) {
    case 1:
      return m + 1;
    case 2:
      return m === 0 ? 7 : m;
    case 3:
      return m === 0 ? 6 : m - 1;
  }

  const delta = type - 10;
  const result = (m + 1 - delta + 7) % 7; // +7 to avoid applying modulo on negative numbers
  return result === 0 ? 7 : result;
}

export const WEEKDAY = {
  description: _t("Day of the week of the date provided (as number)."),
  args: [
    arg(
      "date (date)",
      _t(
        "The date for which to determine the day of the week. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      `type (number, default=${DEFAULT_TYPE})`,
      _t(
        "A number indicating which numbering system to use to represent weekdays. By default, counts starting with Sunday = 1."
      ),
      [
        { value: 1, label: _t("Numbers 1 (Sunday) trough 7 (Saturday)") },
        { value: 2, label: _t("Numbers 1 (Monday) trough 7 (Sunday)") },
        { value: 3, label: _t("Numbers 0 (Monday) trough 6 (Sunday)") },
        { value: 11, label: _t("Numbers 1 (Monday) trough 7 (Sunday)") },
        { value: 12, label: _t("Numbers 1 (Tuesday) trough 7 (Monday)") },
        { value: 13, label: _t("Numbers 1 (Wednesday) trough 7 (Tuesday)") },
        { value: 14, label: _t("Numbers 1 (Thursday) trough 7 (Wednesday)") },
        { value: 15, label: _t("Numbers 1 (Friday) trough 7 (Thursday)") },
        { value: 16, label: _t("Numbers 1 (Saturday) trough 7 (Friday)") },
        { value: 17, label: _t("Numbers 1 (Sunday) trough 7 (Saturday)") },
      ]
    ),
  ],
  compute: function (
    date: Maybe<FunctionResultObject>,
    type: Maybe<FunctionResultObject> = { value: DEFAULT_TYPE }
  ) {
    const _date = toJsDate(date, this.locale);
    const _type = Math.round(toNumber(type, this.locale));
    const m = _date.getDay(); // "getDay()+1" return 1 for Sunday, 2 for Monday, ..., 7 for Saturday
    return { value: weekDayCalc(m, _type) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// WEEKNUM
// -----------------------------------------------------------------------------

function weekNumCalc(date: DateTime, type: number): number {
  if (![1, 2, 11, 12, 13, 14, 15, 16, 17].includes(type)) {
    throw new EvaluationError(_t("The type (%s) is out of range.", type.toString()));
  }

  let startDayOfWeek: number;
  if (type === 1 || type === 2) {
    startDayOfWeek = type - 1;
  } else {
    // case 11 <= type <= 17
    startDayOfWeek = type - 10 === 7 ? 0 : type - 10;
  }

  const y = date.getFullYear();

  let dayStart = 1;
  let startDayOfFirstWeek = new DateTime(y, 0, dayStart);

  while (startDayOfFirstWeek.getDay() !== startDayOfWeek) {
    dayStart += 1;
    startDayOfFirstWeek = new DateTime(y, 0, dayStart);
  }

  const dif = (date.getTime() - startDayOfFirstWeek.getTime()) / MS_PER_DAY;

  if (dif < 0) {
    return 1;
  }
  return Math.floor(dif / 7) + (dayStart === 1 ? 1 : 2);
}

export const WEEKNUM = {
  description: _t("Week number of the year."),
  args: [
    arg(
      "date (date)",
      _t(
        "The date for which to determine the week number. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      `type (number, default=${DEFAULT_TYPE})`,
      _t("A number representing the day that a week starts on. Sunday = 1."),
      [
        { value: 1, label: _t("Sunday") },
        { value: 2, label: _t("Monday") },
        { value: 11, label: _t("Monday") },
        { value: 12, label: _t("Tuesday") },
        { value: 13, label: _t("Wednesday") },
        { value: 14, label: _t("Thursday") },
        { value: 15, label: _t("Friday") },
        { value: 16, label: _t("Saturday") },
        { value: 17, label: _t("Sunday") },
        { value: 21, label: _t("ISO week number (Monday as first day of the week)") },
      ]
    ),
  ],
  compute: function (
    date: Maybe<FunctionResultObject>,
    type: Maybe<FunctionResultObject> = { value: DEFAULT_TYPE }
  ) {
    const _date = toJsDate(date, this.locale);
    const _type = Math.round(toNumber(type, this.locale));
    if (_type === 21) {
      return ISOWEEKNUM.compute.bind(this)(date);
    }
    return { value: weekNumCalc(_date, _type) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// WORKDAY
// -----------------------------------------------------------------------------
export const WORKDAY = {
  description: _t("Date after a number of workdays."),
  args: [
    arg("start_date (date)", _t("The date from which to begin counting.")),
    arg(
      "num_days (number)",
      _t("The number of working days to advance from start_date. If negative, counts backwards.")
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _t("A range or array constant containing the dates to consider holidays.")
    ),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    numDays: Maybe<FunctionResultObject>,
    holidays: Arg = undefined
  ) {
    return WORKDAY_INTL.compute.bind(this)(startDate, numDays, { value: 1 }, holidays);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// WORKDAY.INTL
// -----------------------------------------------------------------------------
export const WORKDAY_INTL = {
  description: _t("Date after a number of workdays (specifying weekends)."),
  args: [
    arg("start_date (date)", _t("The date from which to begin counting.")),
    arg(
      "num_days (number)",
      _t("The number of working days to advance from start_date. If negative, counts backwards.")
    ),
    arg(
      `weekend (any, default=${DEFAULT_WEEKEND})`,
      _t("A number or string representing which days of the week are considered weekends."),
      WEEKEND_OPTIONS
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _t("A range or array constant containing the dates to consider holidays.")
    ),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    numDays: Maybe<FunctionResultObject>,
    weekend: Maybe<FunctionResultObject> = { value: DEFAULT_WEEKEND },
    holidays: Arg
  ) {
    const _startDate = toJsDate(startDate, this.locale);
    const _numDays = Math.trunc(toNumber(numDays, this.locale));
    if (weekend.value === "1111111") {
      return new EvaluationError(_t("The weekend must be different from '1111111'."));
    }

    const daysWeekend = weekendToDayNumber(weekend);

    const timesHoliday = new Set();
    if (holidays !== undefined) {
      visitAny([holidays], (h) => {
        const holiday = toJsDate(h, this.locale);
        timesHoliday.add(holiday.getTime());
      });
    }

    const stepDate = DateTime.fromTimestamp(_startDate.getTime());
    let timeStepDate = stepDate.getTime();

    const unitDay = Math.sign(_numDays);
    let stepDay = Math.abs(_numDays);

    while (stepDay > 0) {
      stepDate.setDate(stepDate.getDate() + unitDay);
      timeStepDate = stepDate.getTime();

      if (!daysWeekend.includes(stepDate.getDay()) && !timesHoliday.has(timeStepDate)) {
        stepDay -= 1;
      }
    }

    const delta = timeStepDate - INITIAL_1900_DAY.getTime();
    return {
      value: Math.round(delta / MS_PER_DAY),
      format: this.locale.dateFormat,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YEAR
// -----------------------------------------------------------------------------
export const YEAR = {
  description: _t("Year specified by a given date."),
  args: [arg("date (date)", _t("The date from which to extract the year."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: toJsDate(date, this.locale).getFullYear() };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YEARFRAC
// -----------------------------------------------------------------------------
const DEFAULT_DAY_COUNT_CONVENTION = 0;
export const YEARFRAC = {
  description: _t("Exact number of years between two dates."),
  args: [
    arg(
      "start_date (date)",
      _t(
        "The start date to consider in the calculation. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      "end_date (date)",
      _t(
        "The end date to consider in the calculation. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION})`,
      _t("An indicator of what day count method to use."),
      DAY_COUNT_CONVENTION_OPTIONS
    ),
  ],
  compute: function (
    startDate: Maybe<FunctionResultObject>,
    endDate: Maybe<FunctionResultObject>,
    dayCountConvention: Maybe<FunctionResultObject> = { value: DEFAULT_DAY_COUNT_CONVENTION }
  ) {
    const _startDate = Math.trunc(toNumber(startDate, this.locale));
    const _endDate = Math.trunc(toNumber(endDate, this.locale));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention, this.locale));

    if (_startDate < 0) {
      return new EvaluationError(_t("The start_date (%s) must be positive or null.", _startDate));
    }
    if (_endDate < 0) {
      return new EvaluationError(_t("The end_date (%s) must be positive or null.", _endDate));
    }
    if (0 > _dayCountConvention || _dayCountConvention > 4) {
      return new EvaluationError(
        _t("The day_count_convention (%s) must be between 0 and 4 inclusive.", _dayCountConvention)
      );
    }

    return { value: getYearFrac(_startDate, _endDate, _dayCountConvention) };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MONTH.START
// -----------------------------------------------------------------------------
export const MONTH_START = {
  description: _t("First day of the month preceding a date."),
  args: [arg("date (date)", _t("The date from which to calculate the result."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    const _startDate = toJsDate(date, this.locale);
    const yStart = _startDate.getFullYear();
    const mStart = _startDate.getMonth();
    const jsDate = new DateTime(yStart, mStart, 1);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MONTH.END
// -----------------------------------------------------------------------------
export const MONTH_END = {
  description: _t("Last day of the month following a date."),
  args: [arg("date (date)", _t("The date from which to calculate the result."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return EOMONTH.compute.bind(this)(date, { value: 0 });
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// QUARTER
// -----------------------------------------------------------------------------
export const QUARTER = {
  description: _t("Quarter of the year a specific date falls in"),
  args: [arg("date (date)", _t("The date from which to extract the quarter."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    return { value: Math.ceil((toJsDate(date, this.locale).getMonth() + 1) / 3) };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// QUARTER.START
// -----------------------------------------------------------------------------
export const QUARTER_START = {
  description: _t("First day of the quarter of the year a specific date falls in."),
  args: [arg("date (date)", _t("The date from which to calculate the start of quarter."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    const quarter = QUARTER.compute.bind(this)(date);
    const year = YEAR.compute.bind(this)(date);
    const jsDate = new DateTime(year.value, (quarter.value - 1) * 3, 1);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// QUARTER.END
// -----------------------------------------------------------------------------
export const QUARTER_END = {
  description: _t("Last day of the quarter of the year a specific date falls in."),
  args: [arg("date (date)", _t("The date from which to calculate the end of quarter."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    const quarter = QUARTER.compute.bind(this)(date);
    const year = YEAR.compute.bind(this)(date);
    const jsDate = new DateTime(year.value, quarter.value * 3, 0);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YEAR.START
// -----------------------------------------------------------------------------
export const YEAR_START = {
  description: _t("First day of the year a specific date falls in."),
  args: [arg("date (date)", _t("The date from which to calculate the start of the year."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    const year = YEAR.compute.bind(this)(date);
    const jsDate = new DateTime(year.value, 0, 1);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// YEAR.END
// -----------------------------------------------------------------------------
export const YEAR_END = {
  description: _t("Last day of the year a specific date falls in."),
  args: [arg("date (date)", _t("The date from which to calculate the end of the year."))],
  compute: function (date: Maybe<FunctionResultObject>) {
    const year = YEAR.compute.bind(this)(date);
    const jsDate = new DateTime(year.value + 1, 0, 0);
    return {
      value: jsDateToRoundNumber(jsDate),
      format: this.locale.dateFormat,
    };
  },
} satisfies AddFunctionDescription;
