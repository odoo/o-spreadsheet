import {
  addMonthsToDate,
  DateTime,
  getYearFrac,
  INITIAL_1900_DAY,
  jsDateToRoundNumber,
  MS_PER_DAY,
  parseDateTime,
} from "../helpers/dates";
import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue, PrimitiveArgValue } from "../types";
import { arg } from "./arguments";
import { assert, toBoolean, toJsDate, toNumber, toString, visitAny } from "./helpers";

const DEFAULT_TYPE = 1;
const DEFAULT_WEEKEND = 1;

// -----------------------------------------------------------------------------
// DATE
// -----------------------------------------------------------------------------
export const DATE: AddFunctionDescription = {
  description: _lt("Converts year/month/day into a date."),
  args: [
    arg("year (number)", _lt("The year component of the date.")),
    arg("month (number)", _lt("The month component of the date.")),
    arg("day (number)", _lt("The day component of the date.")),
  ],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    year: PrimitiveArgValue,
    month: PrimitiveArgValue,
    day: PrimitiveArgValue
  ): number {
    let _year = Math.trunc(toNumber(year));
    const _month = Math.trunc(toNumber(month));
    const _day = Math.trunc(toNumber(day));

    // For years less than 0 or greater than 10000, return #ERROR.
    assert(
      () => 0 <= _year && _year <= 9999,
      _lt("The year (%s) must be between 0 and 9999 inclusive.", _year.toString())
    );

    // Between 0 and 1899, we add that value to 1900 to calculate the year
    if (_year < 1900) {
      _year += 1900;
    }

    const jsDate = new DateTime(_year, _month - 1, _day);
    const result = jsDateToRoundNumber(jsDate);

    assert(
      () => result >= 0,
      _lt(`The function [[FUNCTION_NAME]] result must be greater than or equal 01/01/1900.`)
    );

    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DATEVALUE
// -----------------------------------------------------------------------------
export const DATEVALUE: AddFunctionDescription = {
  description: _lt("Converts a date string to a date value."),
  args: [arg("date_string (string)", _lt("The string representing the date."))],
  returns: ["NUMBER"],
  compute: function (dateString: PrimitiveArgValue): number {
    const _dateString = toString(dateString);
    const internalDate = parseDateTime(_dateString);

    assert(
      () => internalDate !== null,
      _lt("The date_string (%s) cannot be parsed to date/time.", _dateString.toString())
    );

    return Math.trunc(internalDate!.value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DAY
// -----------------------------------------------------------------------------
export const DAY: AddFunctionDescription = {
  description: _lt("Day of the month that a specific date falls on."),
  args: [arg("date (string)", _lt("The date from which to extract the day."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return toJsDate(date).getDate();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DAYS
// -----------------------------------------------------------------------------
export const DAYS: AddFunctionDescription = {
  description: _lt("Number of days between two dates."),
  args: [
    arg("end_date (date)", _lt("The end of the date range.")),
    arg("start_date (date)", _lt("The start of the date range.")),
  ],
  returns: ["NUMBER"],
  compute: function (endDate: PrimitiveArgValue, startDate: PrimitiveArgValue): number {
    const _endDate = toJsDate(endDate);
    const _startDate = toJsDate(startDate);
    const dateDif = _endDate.getTime() - _startDate.getTime();
    return Math.round(dateDif / MS_PER_DAY);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DAYS360
// -----------------------------------------------------------------------------
const DEFAULT_DAY_COUNT_METHOD = 0;
export const DAYS360: AddFunctionDescription = {
  description: _lt("Number of days between two dates on a 360-day year (months of 30 days)."),
  args: [
    arg("start_date (date)", _lt("The start date to consider in the calculation.")),
    arg("end_date (date)", _lt("The end date to consider in the calculation.")),
    arg(
      `method (number, default=${DEFAULT_DAY_COUNT_METHOD})`,
      _lt("An indicator of what day count method to use. (0) US NASD method (1) European method")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    startDate: PrimitiveArgValue,
    endDate: PrimitiveArgValue,
    method: PrimitiveArgValue = DEFAULT_DAY_COUNT_METHOD
  ): number {
    const _startDate = toNumber(startDate);
    const _endDate = toNumber(endDate);
    const dayCountConvention = toBoolean(method) ? 4 : 0;

    const yearFrac = YEARFRAC.compute(startDate, endDate, dayCountConvention) as number;
    return Math.sign(_endDate - _startDate) * Math.round(yearFrac * 360);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// EDATE
// -----------------------------------------------------------------------------
export const EDATE: AddFunctionDescription = {
  description: _lt("Date a number of months before/after another date."),
  args: [
    arg("start_date (date)", _lt("The date from which to calculate the result.")),
    arg(
      "months (number)",
      _lt("The number of months before (negative) or after (positive) 'start_date' to calculate.")
    ),
  ],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (startDate: PrimitiveArgValue, months: PrimitiveArgValue): number {
    const _startDate = toJsDate(startDate);
    const _months = Math.trunc(toNumber(months));

    const jsDate = addMonthsToDate(_startDate, _months, false);
    return jsDateToRoundNumber(jsDate);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// EOMONTH
// -----------------------------------------------------------------------------
export const EOMONTH: AddFunctionDescription = {
  description: _lt("Last day of a month before or after a date."),
  args: [
    arg("start_date (date)", _lt("The date from which to calculate the result.")),
    arg(
      "months (number)",
      _lt("The number of months before (negative) or after (positive) 'start_date' to consider.")
    ),
  ],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (startDate: PrimitiveArgValue, months: PrimitiveArgValue): number {
    const _startDate = toJsDate(startDate);
    const _months = Math.trunc(toNumber(months));

    const yStart = _startDate.getFullYear();
    const mStart = _startDate.getMonth();
    const jsDate = new DateTime(yStart, mStart + _months + 1, 0);
    return jsDateToRoundNumber(jsDate);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// HOUR
// -----------------------------------------------------------------------------
export const HOUR: AddFunctionDescription = {
  description: _lt("Hour component of a specific time."),
  args: [arg("time (date)", _lt("The time from which to calculate the hour component."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return toJsDate(date).getHours();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISOWEEKNUM
// -----------------------------------------------------------------------------
export const ISOWEEKNUM: AddFunctionDescription = {
  description: _lt("ISO week number of the year."),
  args: [
    arg(
      "date (date)",
      _lt(
        "The date for which to determine the ISO week number. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    const _date = toJsDate(date);
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
    return Math.floor(diff / 7) + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MINUTE
// -----------------------------------------------------------------------------
export const MINUTE: AddFunctionDescription = {
  description: _lt("Minute component of a specific time."),
  args: [arg("time (date)", _lt("The time from which to calculate the minute component."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return toJsDate(date).getMinutes();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MONTH
// -----------------------------------------------------------------------------
export const MONTH: AddFunctionDescription = {
  description: _lt("Month of the year a specific date falls in"),
  args: [arg("date (date)", _lt("The date from which to extract the month."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return toJsDate(date).getMonth() + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NETWORKDAYS
// -----------------------------------------------------------------------------
export const NETWORKDAYS: AddFunctionDescription = {
  description: _lt("Net working days between two provided days."),
  args: [
    arg(
      "start_date (date)",
      _lt("The start date of the period from which to calculate the number of net working days.")
    ),
    arg(
      "end_date (date)",
      _lt("The end date of the period from which to calculate the number of net working days.")
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _lt("A range or array constant containing the date serial numbers to consider holidays.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    startDate: PrimitiveArgValue,
    endDate: PrimitiveArgValue,
    holidays: ArgValue
  ): number {
    return NETWORKDAYS_INTL.compute(startDate, endDate, 1, holidays) as number;
  },
  isExported: true,
};

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
function weekendToDayNumber(weekend: PrimitiveArgValue): number[] {
  // case "string"
  if (typeof weekend === "string") {
    assert(() => {
      if (weekend.length !== 7) {
        return false;
      }
      for (let day of weekend) {
        if (day !== "0" && day !== "1") {
          return false;
        }
      }
      return true;
    }, _lt('When weekend is a string (%s) it must be composed of "0" or "1".', weekend));

    let result: number[] = [];
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
      () => (1 <= weekend && weekend <= 7) || (11 <= weekend && weekend <= 17),
      _lt(
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

  throw Error(_lt("The weekend must be a number or a string."));
}

export const NETWORKDAYS_INTL: AddFunctionDescription = {
  description: _lt("Net working days between two dates (specifying weekends)."),
  args: [
    arg(
      "start_date (date)",
      _lt("The start date of the period from which to calculate the number of net working days.")
    ),
    arg(
      "end_date (date)",
      _lt("The end date of the period from which to calculate the number of net working days.")
    ),
    arg(
      `weekend (any, default=${DEFAULT_WEEKEND})`,
      _lt("A number or string representing which days of the week are considered weekends.")
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _lt("A range or array constant containing the dates to consider as holidays.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    startDate: PrimitiveArgValue,
    endDate: PrimitiveArgValue,
    weekend: PrimitiveArgValue = DEFAULT_WEEKEND,
    holidays: ArgValue
  ): number {
    const _startDate = toJsDate(startDate);
    const _endDate = toJsDate(endDate);
    const daysWeekend = weekendToDayNumber(weekend);
    let timesHoliday = new Set();
    if (holidays !== undefined) {
      visitAny([holidays], (h) => {
        const holiday = toJsDate(h);
        timesHoliday.add(holiday.getTime());
      });
    }

    const invertDate = _startDate.getTime() > _endDate.getTime();
    const stopDate = DateTime.fromTimestamp((invertDate ? _startDate : _endDate).getTime());
    let stepDate = DateTime.fromTimestamp((invertDate ? _endDate : _startDate).getTime());
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

    return invertDate ? -netWorkingDay : netWorkingDay;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NOW
// -----------------------------------------------------------------------------

export const NOW: AddFunctionDescription = {
  description: _lt("Current date and time as a date value."),
  args: [],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy hh:mm:ss",
  compute: function (): number {
    let today = DateTime.now();
    const delta = today.getTime() - INITIAL_1900_DAY.getTime();
    const time = today.getHours() / 24 + today.getMinutes() / 1440 + today.getSeconds() / 86400;
    return Math.floor(delta / MS_PER_DAY) + time;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SECOND
// -----------------------------------------------------------------------------
export const SECOND: AddFunctionDescription = {
  description: _lt("Minute component of a specific time."),
  args: [arg("time (date)", _lt("The time from which to calculate the second component."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return toJsDate(date).getSeconds();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TIME
// -----------------------------------------------------------------------------
export const TIME: AddFunctionDescription = {
  description: _lt("Converts hour/minute/second into a time."),
  args: [
    arg("hour (number)", _lt("The hour component of the time.")),
    arg("minute (number)", _lt("The minute component of the time.")),
    arg("second (number)", _lt("The second component of the time.")),
  ],
  returns: ["DATE"],
  computeFormat: () => "hh:mm:ss a",
  compute: function (
    hour: PrimitiveArgValue,
    minute: PrimitiveArgValue,
    second: PrimitiveArgValue
  ): number {
    let _hour = Math.trunc(toNumber(hour));
    let _minute = Math.trunc(toNumber(minute));
    let _second = Math.trunc(toNumber(second));

    _minute += Math.floor(_second / 60);
    _second = (_second % 60) + (_second < 0 ? 60 : 0);

    _hour += Math.floor(_minute / 60);
    _minute = (_minute % 60) + (_minute < 0 ? 60 : 0);

    _hour %= 24;

    assert(() => _hour >= 0, _lt(`The function [[FUNCTION_NAME]] result cannot be negative`));

    return _hour / 24 + _minute / (24 * 60) + _second / (24 * 60 * 60);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TIMEVALUE
// -----------------------------------------------------------------------------
export const TIMEVALUE: AddFunctionDescription = {
  description: _lt("Converts a time string into its serial number representation."),
  args: [arg("time_string (string)", _lt("The string that holds the time representation."))],
  returns: ["NUMBER"],
  compute: function (timeString: PrimitiveArgValue): number {
    const _timeString = toString(timeString);
    const internalDate = parseDateTime(_timeString);

    assert(
      () => internalDate !== null,
      _lt("The time_string (%s) cannot be parsed to date/time.", _timeString)
    );
    const result = internalDate!.value - Math.trunc(internalDate!.value);

    return result < 0 ? 1 + result : result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TODAY
// -----------------------------------------------------------------------------
export const TODAY: AddFunctionDescription = {
  description: _lt("Current date as a date value."),
  args: [],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (): number {
    const today = DateTime.now();
    const jsDate = new DateTime(today.getFullYear(), today.getMonth(), today.getDate());
    return jsDateToRoundNumber(jsDate);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// WEEKDAY
// -----------------------------------------------------------------------------
export const WEEKDAY: AddFunctionDescription = {
  description: _lt("Day of the week of the date provided (as number)."),
  args: [
    arg(
      "date (date)",
      _lt(
        "The date for which to determine the day of the week. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      `type (number, default=${DEFAULT_TYPE})`,
      _lt(
        "A number indicating which numbering system to use to represent weekdays. By default, counts starting with Sunday = 1."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue, type: PrimitiveArgValue = DEFAULT_TYPE): number {
    const _date = toJsDate(date);
    const _type = Math.round(toNumber(type));
    const m = _date.getDay();
    assert(
      () => [1, 2, 3].includes(_type),
      _lt("The type (%s) must be 1, 2 or 3.", _type.toString())
    );

    if (_type === 1) return m + 1;
    if (_type === 2) return m === 0 ? 7 : m;
    return m === 0 ? 6 : m - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// WEEKNUM
// -----------------------------------------------------------------------------
export const WEEKNUM: AddFunctionDescription = {
  description: _lt("Week number of the year."),
  args: [
    arg(
      "date (date)",
      _lt(
        "The date for which to determine the week number. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      `type (number, default=${DEFAULT_TYPE})`,
      _lt("A number representing the day that a week starts on. Sunday = 1.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue, type: PrimitiveArgValue = DEFAULT_TYPE): number {
    const _date = toJsDate(date);
    const _type = Math.round(toNumber(type));
    assert(
      () => _type === 1 || _type === 2 || (11 <= _type && _type <= 17) || _type === 21,
      _lt("The type (%s) is out of range.", _type.toString())
    );

    if (_type === 21) {
      return ISOWEEKNUM.compute(date) as number;
    }

    let startDayOfWeek: number;
    if (_type === 1 || _type === 2) {
      startDayOfWeek = _type - 1;
    } else {
      // case 11 <= _type <= 17
      startDayOfWeek = _type - 10 === 7 ? 0 : _type - 10;
    }

    const y = _date.getFullYear();

    let dayStart = 1;
    let startDayOfFirstWeek = new DateTime(y, 0, dayStart);

    while (startDayOfFirstWeek.getDay() !== startDayOfWeek) {
      dayStart += 1;
      startDayOfFirstWeek = new DateTime(y, 0, dayStart);
    }

    const dif = (_date.getTime() - startDayOfFirstWeek.getTime()) / MS_PER_DAY;

    if (dif < 0) {
      return 1;
    }
    return Math.floor(dif / 7) + (dayStart === 1 ? 1 : 2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// WORKDAY
// -----------------------------------------------------------------------------
export const WORKDAY: AddFunctionDescription = {
  description: _lt("Date after a number of workdays."),
  args: [
    arg("start_date (date)", _lt("The date from which to begin counting.")),
    arg(
      "num_days (number)",
      _lt("The number of working days to advance from start_date. If negative, counts backwards.")
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _lt("A range or array constant containing the dates to consider holidays.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    startDate: PrimitiveArgValue,
    numDays: PrimitiveArgValue,
    holidays: ArgValue | undefined = undefined
  ): number {
    return WORKDAY_INTL.compute(startDate, numDays, 1, holidays) as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// WORKDAY.INTL
// -----------------------------------------------------------------------------
export const WORKDAY_INTL: AddFunctionDescription = {
  description: _lt("Date after a number of workdays (specifying weekends)."),
  args: [
    arg("start_date (date)", _lt("The date from which to begin counting.")),
    arg(
      "num_days (number)",
      _lt("The number of working days to advance from start_date. If negative, counts backwards.")
    ),
    arg(
      `weekend (any, default=${DEFAULT_WEEKEND})`,
      _lt("A number or string representing which days of the week are considered weekends.")
    ),
    arg(
      "holidays (date, range<date>, optional)",
      _lt("A range or array constant containing the dates to consider holidays.")
    ),
  ],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    startDate: PrimitiveArgValue,
    numDays: PrimitiveArgValue,
    weekend: PrimitiveArgValue = DEFAULT_WEEKEND,
    holidays: ArgValue
  ): number {
    let _startDate = toJsDate(startDate);
    let _numDays = Math.trunc(toNumber(numDays));
    if (typeof weekend === "string") {
      assert(
        () => weekend !== "1111111",
        _lt("The weekend (%s) must be different from '1111111'.", weekend)
      );
    }

    const daysWeekend = weekendToDayNumber(weekend);

    let timesHoliday = new Set();
    if (holidays !== undefined) {
      visitAny([holidays], (h) => {
        const holiday = toJsDate(h);
        timesHoliday.add(holiday.getTime());
      });
    }

    let stepDate = DateTime.fromTimestamp(_startDate.getTime());
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
    return Math.round(delta / MS_PER_DAY);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// YEAR
// -----------------------------------------------------------------------------
export const YEAR: AddFunctionDescription = {
  description: _lt("Year specified by a given date."),
  args: [arg("date (date)", _lt("The date from which to extract the year."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return toJsDate(date).getFullYear();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// YEARFRAC
// -----------------------------------------------------------------------------
const DEFAULT_DAY_COUNT_CONVENTION = 0;
export const YEARFRAC: AddFunctionDescription = {
  description: _lt("Exact number of years between two dates."),
  args: [
    arg(
      "start_date (date)",
      _lt(
        "The start date to consider in the calculation. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      "end_date (date)",
      _lt(
        "The end date to consider in the calculation. Must be a reference to a cell containing a date, a function returning a date type, or a number."
      )
    ),
    arg(
      `day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION})`,
      _lt("An indicator of what day count method to use.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    startDate: PrimitiveArgValue,
    endDate: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    let _startDate = Math.trunc(toNumber(startDate));
    let _endDate = Math.trunc(toNumber(endDate));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assert(
      () => _startDate >= 0,
      _lt("The start_date (%s) must be positive or null.", _startDate.toString())
    );
    assert(
      () => _endDate >= 0,
      _lt("The end_date (%s) must be positive or null.", _endDate.toString())
    );
    assert(
      () => 0 <= _dayCountConvention && _dayCountConvention <= 4,
      _lt(
        "The day_count_convention (%s) must be between 0 and 4 inclusive.",
        _dayCountConvention.toString()
      )
    );

    return getYearFrac(_startDate, _endDate, _dayCountConvention);
  },
};

// -----------------------------------------------------------------------------
// MONTH.START
// -----------------------------------------------------------------------------
export const MONTH_START: AddFunctionDescription = {
  description: _lt("First day of the month preceding a date."),
  args: [arg("date (date)", _lt("The date from which to calculate the result."))],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (date: PrimitiveArgValue): number {
    const _startDate = toJsDate(date);
    const yStart = _startDate.getFullYear();
    const mStart = _startDate.getMonth();
    const jsDate = new DateTime(yStart, mStart, 1);
    return jsDateToRoundNumber(jsDate);
  },
};

// -----------------------------------------------------------------------------
// MONTH.END
// -----------------------------------------------------------------------------
export const MONTH_END: AddFunctionDescription = {
  description: _lt("Last day of the month following a date."),
  args: [arg("date (date)", _lt("The date from which to calculate the result."))],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (date: PrimitiveArgValue): number {
    return EOMONTH.compute(date, 0) as number;
  },
};

// -----------------------------------------------------------------------------
// QUARTER
// -----------------------------------------------------------------------------
export const QUARTER: AddFunctionDescription = {
  description: _lt("Quarter of the year a specific date falls in"),
  args: [arg("date (date)", _lt("The date from which to extract the quarter."))],
  returns: ["NUMBER"],
  compute: function (date: PrimitiveArgValue): number {
    return Math.ceil((toJsDate(date).getMonth() + 1) / 3);
  },
};

// -----------------------------------------------------------------------------
// QUARTER.START
// -----------------------------------------------------------------------------
export const QUARTER_START: AddFunctionDescription = {
  description: _lt("First day of the quarter of the year a specific date falls in."),
  args: [arg("date (date)", _lt("The date from which to calculate the start of quarter."))],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (date: PrimitiveArgValue): number {
    const quarter = QUARTER.compute(date) as number;
    const year = YEAR.compute(date) as number;
    const jsDate = new DateTime(year, (quarter - 1) * 3, 1);
    return jsDateToRoundNumber(jsDate);
  },
};

// -----------------------------------------------------------------------------
// QUARTER.END
// -----------------------------------------------------------------------------
export const QUARTER_END: AddFunctionDescription = {
  description: _lt("Last day of the quarter of the year a specific date falls in."),
  args: [arg("date (date)", _lt("The date from which to calculate the end of quarter."))],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (date: PrimitiveArgValue): number {
    const quarter = QUARTER.compute(date) as number;
    const year = YEAR.compute(date) as number;
    const jsDate = new DateTime(year, quarter * 3, 0);
    return jsDateToRoundNumber(jsDate);
  },
};

// -----------------------------------------------------------------------------
// YEAR.START
// -----------------------------------------------------------------------------
export const YEAR_START: AddFunctionDescription = {
  description: _lt("First day of the year a specific date falls in."),
  args: [arg("date (date)", _lt("The date from which to calculate the start of the year."))],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (date: PrimitiveArgValue): number {
    const year = YEAR.compute(date) as number;
    const jsDate = new DateTime(year, 0, 1);
    return jsDateToRoundNumber(jsDate);
  },
};

// -----------------------------------------------------------------------------
// YEAR.END
// -----------------------------------------------------------------------------
export const YEAR_END: AddFunctionDescription = {
  description: _lt("Last day of the year a specific date falls in."),
  args: [arg("date (date)", _lt("The date from which to calculate the end of the year."))],
  returns: ["DATE"],
  computeFormat: () => "m/d/yyyy",
  compute: function (date: PrimitiveArgValue): number {
    const year = YEAR.compute(date) as number;
    const jsDate = new DateTime(year + 1, 0, 0);
    return jsDateToRoundNumber(jsDate);
  },
};
