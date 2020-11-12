import { args } from "./arguments";
import { FunctionDescription } from "../types";
import { toNativeDate, InternalDate, parseDateTime } from "../functions/dates";
import { toNumber, toString, visitAny } from "./helpers";
import { _lt } from "../translation";

const INITIAL_1900_DAY = new Date(1899, 11, 30);

// -----------------------------------------------------------------------------
// DATE
// -----------------------------------------------------------------------------
export const DATE: FunctionDescription = {
  description: _lt("Converts year/month/day into a date."),
  args: args(`
    year (number) ${_lt("The year component of the date.")}")}
    month (number) ${_lt("The month component of the date.")}")}
    day (number) ${_lt("The day component of the date.")}")}
    `),
  returns: ["DATE"],
  compute: function (year: any, month: any, day: any): InternalDate {
    let _year = Math.trunc(toNumber(year));
    const _month = Math.trunc(toNumber(month));
    const _day = Math.trunc(toNumber(day));

    // For years less than 0 or greater than 10000, return #ERROR.
    if (_year < 0 || 10000 <= _year) {
      throw new Error(
        _lt(
          `function [[FUNCTION_NAME]] parameter year should be greater or equal to 0 and lesser than 10000.`
        )
      );
    }

    // Between 0 and 1899, we add that value to 1900 to calculate the year
    if (_year < 1900) {
      _year += 1900;
    }

    const jsDate = new Date(_year, _month - 1, _day);
    const delta = jsDate.getTime() - INITIAL_1900_DAY.getTime();

    if (delta < 0) {
      throw new Error(
        _lt(`function [[FUNCTION_NAME]] result should not be lesser than 01/01/1900`)
      );
    }

    return {
      value: Math.round(delta / 86400000),
      format: "m/d/yyyy",
      jsDate: jsDate,
    };
  },
};

// -----------------------------------------------------------------------------
// DATEVALUE
// -----------------------------------------------------------------------------
export const DATEVALUE: FunctionDescription = {
  description: _lt("Converts a date string to a date value."),
  args: args(`
      date_string (string) ${_lt("The string representing the date.")}
    `),
  returns: ["NUMBER"],
  compute: function (dateString: any): number {
    const _dateString = toString(dateString);
    const datetime = parseDateTime(_dateString);
    if (datetime === null) {
      throw new Error(
        _lt(`[[FUNCTION_NAME]] parameter '${_dateString}' cannot be parsed to date/time.`)
      );
    }
    return Math.trunc(datetime.value);
  },
};

// -----------------------------------------------------------------------------
// DAY
// -----------------------------------------------------------------------------
export const DAY: FunctionDescription = {
  description: _lt("Day of the month that a specific date falls on."),
  args: args(`
      date (string) ${_lt("The date from which to extract the day.")}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getDate();
  },
};

// -----------------------------------------------------------------------------
// DAYS
// -----------------------------------------------------------------------------
export const DAYS: FunctionDescription = {
  description: _lt("Number of days between two dates."),
  args: args(`
      end_date (date) ${_lt("The end of the date range.")}
      start_date (date) ${_lt("The start of the date range.")}
    `),
  returns: ["NUMBER"],
  compute: function (endDate: any, startDate: any): number {
    const _endDate = toNativeDate(endDate);
    const _startDate = toNativeDate(startDate);
    const dateDif = _endDate.getTime() - _startDate.getTime();
    return Math.round(dateDif / 86400000);
  },
};

// -----------------------------------------------------------------------------
// EDATE
// -----------------------------------------------------------------------------
export const EDATE: FunctionDescription = {
  description: _lt("Date a number of months before/after another date."),
  args: args(`
    start_date (date) ${_lt("The date from which to calculate the result.")}
    months (number) ${_lt(
      "The number of months before (negative) or after (positive) 'start_date' to calculate."
    )}
    `),
  returns: ["DATE"],
  compute: function (startDate: any, months: any): InternalDate {
    const _startDate = toNativeDate(startDate);
    const _months = Math.trunc(toNumber(months));

    const yStart = _startDate.getFullYear();
    const mStart = _startDate.getMonth();
    const dStart = _startDate.getDate();
    const jsDate = new Date(yStart, mStart + _months, dStart);
    const delta = jsDate.getTime() - INITIAL_1900_DAY.getTime();

    return {
      value: Math.round(delta / 86400000),
      format: "m/d/yyyy",
      jsDate: jsDate,
    };
  },
};

// -----------------------------------------------------------------------------
// EOMONTH
// -----------------------------------------------------------------------------
export const EOMONTH: FunctionDescription = {
  description: _lt("Last day of a month before or after a date."),
  args: args(`
    start_date (date) ${_lt("The date from which to calculate the result.")}
    months (number) ${_lt(
      "The number of months before (negative) or after (positive) 'start_date' to consider."
    )}
    `),
  returns: ["DATE"],
  compute: function (startDate: any, months: any): InternalDate {
    const _startDate = toNativeDate(startDate);
    const _months = Math.trunc(toNumber(months));

    const yStart = _startDate.getFullYear();
    const mStart = _startDate.getMonth();
    const jsDate = new Date(yStart, mStart + _months + 1, 0);
    const delta = jsDate.getTime() - INITIAL_1900_DAY.getTime();

    return {
      value: Math.round(delta / 86400000),
      format: "m/d/yyyy",
      jsDate: jsDate,
    };
  },
};

// -----------------------------------------------------------------------------
// HOUR
// -----------------------------------------------------------------------------
export const HOUR: FunctionDescription = {
  description: _lt("Hour component of a specific time."),
  args: args(`
    time (date) ${_lt("The time from which to calculate the hour component.")}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getHours();
  },
};

// -----------------------------------------------------------------------------
// ISOWEEKNUM
// -----------------------------------------------------------------------------
export const ISOWEEKNUM: FunctionDescription = {
  description: _lt("ISO week number of the year."),
  args: args(`
    date (date) ${_lt(
      "The date for which to determine the ISO week number. Must be a reference to a cell containing a date, a function returning a date type, or a number."
    )}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    const _date = toNativeDate(date);
    const y = _date.getFullYear();

    // 1 - As the 1st week of a year can start the previous year or after the 1st
    // january we first look if the date is in the weeks of the current year, previous
    // year or year after.

    // A - We look for the current year, the first days of the first week
    // and the last days of the last week

    // The first week of the year is the week that contains the first
    // Thursday of the year.

    let firstThursday = 1;
    while (new Date(y, 0, firstThursday).getDay() !== 4) {
      firstThursday += 1;
    }
    const firstDayOfFirstWeek = new Date(y, 0, firstThursday - 3);

    // The last week of the year is the week that contains the last Thursday of
    // the year.

    let lastThursday = 31;
    while (new Date(y, 11, lastThursday).getDay() !== 4) {
      lastThursday -= 1;
    }
    const lastDayOfLastWeek = new Date(y, 11, lastThursday + 3);

    // B - If our date > lastDayOfLastWeek then it's in the weeks of the year after
    // If our date < firstDayOfFirstWeek then it's in the weeks of the year before

    let offsetYear;
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

    let firstDay;
    switch (offsetYear) {
      case 0:
        firstDay = firstDayOfFirstWeek;
        break;
      case 1:
        // firstDay is the 1st day of the 1st week of the year after
        // firstDay = lastDayOfLastWeek + 1 Day
        firstDay = new Date(y, 11, lastThursday + 3 + 1);
        break;
      case -1:
        // firstDay is the 1st day of the 1st week of the previous year.
        // The first week of the previous year is the week that contains the
        // first Thursday of the previous year.
        let firstThursdayPreviousYear = 1;
        while (new Date(y - 1, 0, firstThursdayPreviousYear).getDay() !== 4) {
          firstThursdayPreviousYear += 1;
        }
        firstDay = new Date(y - 1, 0, firstThursdayPreviousYear - 3);
        break;
    }

    const dif = (_date.getTime() - firstDay.getTime()) / 86400000;
    return Math.floor(dif / 7) + 1;
  },
};

// -----------------------------------------------------------------------------
// MINUTE
// -----------------------------------------------------------------------------
export const MINUTE: FunctionDescription = {
  description: _lt("Minute component of a specific time."),
  args: args(`
      time (date) ${_lt("The time from which to calculate the minute component.")}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getMinutes();
  },
};

// -----------------------------------------------------------------------------
// MONTH
// -----------------------------------------------------------------------------
export const MONTH: FunctionDescription = {
  description: _lt("Month of the year a specific date falls in"),
  args: args(`
      date (date) ${_lt("The date from which to extract the month.")}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getMonth() + 1;
  },
};

// -----------------------------------------------------------------------------
// NETWORKDAYS
// -----------------------------------------------------------------------------
export const NETWORKDAYS: FunctionDescription = {
  description: _lt("Net working days between two provided days."),
  args: args(`
      start_date (date) ${_lt(
        "The start date of the period from which to calculate the number of net working days."
      )}
      end_date (date) ${_lt(
        "The end date of the period from which to calculate the number of net working days."
      )}
      holidays (date, range<date>, optional) ${_lt(
        "A range or array constant containing the date serial numbers to consider holidays."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (startDate: any, endDate: any, holidays: any): number {
    return NETWORKDAYS_INTL.compute(startDate, endDate, 1, holidays);
  },
};

// -----------------------------------------------------------------------------
// NETWORKDAYS.INTL
// -----------------------------------------------------------------------------

/**
 * Transform weekend Spreadsheet informations into Date Day JavaScript informations.
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
 * Exemple:
 * - 11 return [0] (correspond to Sunday)
 * - 12 return [1] (correspond to Monday)
 * - 3 return [1,2] (correspond to Monday and Tuesday)
 * - "0101010" return [2,4,6] (correspond to Tuesday, Thursday and Saturday)
 */
function weekendToDayNumber(weekend: any): number[] {
  if (typeof weekend === "string") {
    let result: number[] = [];

    if (weekend.length === 7) {
      for (let i = 0; i < 7; i++) {
        switch (weekend.charAt(i)) {
          case "0":
            break;
          case "1":
            // "1000000" corespond to Monday [1]
            // "0000010" corespond to Saturday [6]
            // "0000001" corespond to Sunday [0]
            result.push(i + 1 === 7 ? 0 : i + 1);
            break;
          default:
            throw new Error(
              _lt(
                `Function [[FUNCTION_NAME]] parameter 3 requires a string composed of 0 or 1. Actual string is '${weekend}'.`
              )
            );
        }
      }
      return result;
    }
    throw new Error(
      _lt(
        `Function [[FUNCTION_NAME]] parameter 3 requires a string with 7 characters. Actual string is '${weekend}'.`
      )
    );
  }

  if (typeof weekend === "number") {
    if (1 <= weekend && weekend <= 7) {
      // 1 = Saturday/Sunday are weekends
      // 2 = Sunday/Monday
      // ...
      // 7 = Friday/Saturday.
      return [weekend - 2 === -1 ? 6 : weekend - 2, weekend - 1];
    }
    if (11 <= weekend && weekend <= 17) {
      // 11 = Sunday is the only weekend
      // 12 = Monday is the only weekend
      // ...
      // 17 = Saturday is the only weekend.
      return [weekend - 11];
    }
    throw new Error(
      _lt(
        `Function [[FUNCTION_NAME]] parameter 3 requires a string or a number in the range 1-7 or 11-17. Actual number is ${weekend}.`
      )
    );
  }

  throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 3 requires a number or a string.`));
}

export const NETWORKDAYS_INTL: FunctionDescription = {
  description: _lt("Net working days between two dates (specifying weekends)."),
  args: args(`
      start_date (date) ${_lt(
        "The start date of the period from which to calculate the number of net working days."
      )}
      end_date (date) ${_lt(
        "The end date of the period from which to calculate the number of net working days."
      )}
      weekend (any, optional, default=1) ${_lt(
        "A number or string representing which days of the week are considered weekends."
      )}
      holidays (date, range<date>, optional) ${_lt(
        "A range or array constant containing the dates to consider as holidays."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (
    startDate: any,
    endDate: any,
    weekend: any = 1,
    holidays: any = undefined
  ): number {
    const _startDate = toNativeDate(startDate);
    const _endDate = toNativeDate(endDate);

    const daysWeekend = weekendToDayNumber(weekend);
    let timesHoliday = new Set();
    if (holidays !== undefined) {
      visitAny(holidays, (h) => {
        const holiday = toNativeDate(h);
        timesHoliday.add(holiday.getTime());
      });
    }

    const invertDate = _startDate.getTime() > _endDate.getTime();
    const stopDate = new Date((invertDate ? _startDate : _endDate).getTime());
    let stepDate = new Date((invertDate ? _endDate : _startDate).getTime());
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
};

// -----------------------------------------------------------------------------
// NOW
// -----------------------------------------------------------------------------

export const NOW: FunctionDescription = {
  description: _lt("Current date and time as a date value."),
  args: [],
  returns: ["DATE"],
  compute: function (): InternalDate {
    let today = new Date();
    today.setMilliseconds(0);
    const delta = today.getTime() - INITIAL_1900_DAY.getTime();
    const time = today.getHours() / 24 + today.getMinutes() / 1440 + today.getSeconds() / 86400;
    return {
      value: Math.floor(delta / 86400000) + time,
      format: "m/d/yyyy hh:mm:ss",
      jsDate: today,
    };
  },
};

// -----------------------------------------------------------------------------
// SECOND
// -----------------------------------------------------------------------------
export const SECOND: FunctionDescription = {
  description: _lt("Minute component of a specific time."),
  args: args(`
      time (date) ${_lt("The time from which to calculate the second component.")}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getSeconds();
  },
};

// -----------------------------------------------------------------------------
// TIME
// -----------------------------------------------------------------------------
export const TIME: FunctionDescription = {
  description: _lt("Converts hour/minute/second into a time."),
  args: args(`
    hour (number) ${_lt("The hour component of the time.")}
    minute (number) ${_lt("The minute component of the time.")}
    second (number) ${_lt("The second component of the time.")}
    `),
  returns: ["DATE"],
  compute: function (hour: any, minute: any, second: any): InternalDate {
    let _hour = Math.trunc(toNumber(hour));
    let _minute = Math.trunc(toNumber(minute));
    let _second = Math.trunc(toNumber(second));

    _minute += Math.floor(_second / 60);
    _second = (_second % 60) + (_second < 0 ? 60 : 0);

    _hour += Math.floor(_minute / 60);
    _minute = (_minute % 60) + (_minute < 0 ? 60 : 0);

    _hour %= 24;

    if (_hour < 0) {
      throw new Error(_lt(`function [[FUNCTION_NAME]] result should not be negative`));
    }

    const jsDate = new Date(1899, 11, 30, _hour, _minute, _second);

    return {
      value: _hour / 24 + _minute / (24 * 60) + _second / (24 * 60 * 60),
      format: "hh:mm:ss a",
      jsDate: jsDate,
    };
  },
};

// -----------------------------------------------------------------------------
// TIMEVALUE
// -----------------------------------------------------------------------------
export const TIMEVALUE: FunctionDescription = {
  description: _lt("Converts a time string into its serial number representation."),
  args: args(`
      time_string (string) ${_lt("The string that holds the time representation.")}
    `),
  returns: ["NUMBER"],
  compute: function (timeString: any): number {
    const _timeString = toString(timeString);
    const datetime = parseDateTime(_timeString);
    if (datetime === null) {
      throw new Error(
        _lt(`[[FUNCTION_NAME]] parameter '${_timeString}' cannot be parsed to date/time.`)
      );
    }
    const result = datetime.value - Math.trunc(datetime.value);

    return result < 0 ? 1 + result : result;
  },
};

// -----------------------------------------------------------------------------
// TODAY
// -----------------------------------------------------------------------------
export const TODAY: FunctionDescription = {
  description: _lt("Current date as a date value."),
  args: [],
  returns: ["DATE"],
  compute: function (): InternalDate {
    const today = new Date();
    const jsDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const delta = jsDate.getTime() - INITIAL_1900_DAY.getTime();
    return {
      value: Math.round(delta / 86400000),
      format: "m/d/yyyy",
      jsDate: jsDate,
    };
  },
};

// -----------------------------------------------------------------------------
// WEEKDAY
// -----------------------------------------------------------------------------
export const WEEKDAY: FunctionDescription = {
  description: _lt("Day of the week of the date provided (as number)."),
  args: args(`
    date (date) ${_lt(
      "The date for which to determine the day of the week. Must be a reference to a cell containing a date, a function returning a date type, or a number."
    )}
    type (number, optional, default=1) ${_lt(
      "A number indicating which numbering system to use to represent weekdays. By default, counts starting with Sunday = 1."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (date: any, type: any = 1): number {
    const _date = toNativeDate(date);
    const _type = Math.round(toNumber(type));
    const m = _date.getDay();
    switch (_type) {
      case 1:
        return m + 1;
      case 2:
        return m === 0 ? 7 : m;
      case 3:
        return m === 0 ? 6 : m - 1;
    }
    throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value ${_type} is out of range.`));
  },
};

// -----------------------------------------------------------------------------
// WEEKNUM
// -----------------------------------------------------------------------------
export const WEEKNUM: FunctionDescription = {
  description: _lt("Week number of the year."),
  args: args(`
    date (date) ${_lt(
      "The date for which to determine the week number. Must be a reference to a cell containing a date, a function returning a date type, or a number."
    )}
    type (number, optional, default=1) ${_lt(
      "A number representing the day that a week starts on. Sunday = 1."
    )}
    `),
  returns: ["NUMBER"],
  compute: function (date: any, type: any = 1): number {
    const _date = toNativeDate(date);
    const _type = Math.round(toNumber(type));

    let startDayOfWeek: number;

    if (_type === 1 || _type === 2) {
      startDayOfWeek = _type - 1;
    } else if (11 <= _type && _type <= 17) {
      startDayOfWeek = _type - 10 === 7 ? 0 : _type - 10;
    } else if (_type === 21) {
      return ISOWEEKNUM.compute(date);
    } else {
      throw new Error(
        _lt(`Function [[FUNCTION_NAME]] parameter 2 value ${_type} is out of range.`)
      );
    }

    const y = _date.getFullYear();

    let dayStart = 1;
    let startDayOfFirstWeek = new Date(y, 0, dayStart);

    while (startDayOfFirstWeek.getDay() !== startDayOfWeek) {
      dayStart += 1;
      startDayOfFirstWeek = new Date(y, 0, dayStart);
    }

    const dif = (_date.getTime() - startDayOfFirstWeek.getTime()) / 86400000;

    if (dif < 0) {
      return 1;
    }
    return Math.floor(dif / 7) + (dayStart === 1 ? 1 : 2);
  },
};

// -----------------------------------------------------------------------------
// WORKDAY
// -----------------------------------------------------------------------------
export const WORKDAY: FunctionDescription = {
  description: _lt("Number of working days from start date."),
  args: args(`
      start_date (date) ${_lt("The date from which to begin counting.")}
      num_days (number) ${_lt(
        "The number of working days to advance from start_date. If negative, counts backwards."
      )}
      holidays (date, range<date>, optional) ${_lt(
        "A range or array constant containing the dates to consider holidays."
      )}
      `),
  returns: ["NUMBER"],
  compute: function (startDate: any, numDays: any, holidays: any = undefined): number {
    return WORKDAY_INTL.compute(startDate, numDays, 1, holidays);
  },
};

// -----------------------------------------------------------------------------
// WORKDAY.INTL
// -----------------------------------------------------------------------------
export const WORKDAY_INTL: FunctionDescription = {
  description: _lt("Net working days between two dates (specifying weekends)."),
  args: args(`
      start_date (date) ${_lt("The date from which to begin counting.")}
      num_days (number) ${_lt(
        "The number of working days to advance from start_date. If negative, counts backwards."
      )}
      weekend (any, optional, default=1) ${_lt(
        "A number or string representing which days of the week are considered weekends."
      )}
      holidays (date, range<date>, optional) ${_lt(
        "A range or array constant containing the dates to consider holidays."
      )}
    `),
  returns: ["DATE"],
  compute: function (
    startDate: any,
    numDays: any,
    weekend: any = 1,
    holidays: any = undefined
  ): InternalDate {
    let _startDate = toNativeDate(startDate);
    let _numDays = Math.trunc(toNumber(numDays));

    if (weekend === "1111111") {
      throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 3 cannot be equal to '1111111'.`));
    }
    const daysWeekend = weekendToDayNumber(weekend);

    let timesHoliday = new Set();
    if (holidays !== undefined) {
      visitAny(holidays, (h) => {
        const holiday = toNativeDate(h);
        timesHoliday.add(holiday.getTime());
      });
    }

    let stepDate = new Date(_startDate.getTime());
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
      value: Math.round(delta / 86400000),
      format: "m/d/yyyy",
      jsDate: stepDate,
    };
  },
};

// -----------------------------------------------------------------------------
// YEAR
// -----------------------------------------------------------------------------
export const YEAR: FunctionDescription = {
  description: _lt("Year specified by a given date."),
  args: args(`
    date (date) ${_lt("The date from which to extract the year.")}
    `),
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getFullYear();
  },
};
