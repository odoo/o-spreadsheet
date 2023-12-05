// -----------------------------------------------------------------------------
// Date Type
// -----------------------------------------------------------------------------

import { Format } from "../types";

/**
 * All Spreadsheet dates are internally stored as an object with two values:
 * - value (number), which represent the number of day till 30/12/1899
 * - format (string), which keep the information on how the date was defined
 */
export interface InternalDate {
  readonly value: number;
  readonly format: Format;
  readonly jsDate?: ReadonlyDate;
}

type ReadonlyDate = Readonly<
  Omit<
    Date,
    | "setTime"
    | "setMilliseconds"
    | "setUTCMilliseconds"
    | "setSeconds"
    | "setUTCSeconds"
    | "setMinutes"
    | "setUTCMinutes"
    | "setHours"
    | "setUTCHours"
    | "setDate"
    | "setUTCDate"
    | "setMonth"
    | "setUTCMonth"
    | "setFullYear"
    | "setUTCFullYear"
  >
>;

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

export const INITIAL_1900_DAY = new Date(1899, 11, 30);
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CURRENT_MILLENIAL = 2000; // note: don't forget to update this in 2999
const CURRENT_YEAR = new Date().getFullYear();
const INITIAL_JS_DAY = new Date(0);
const DATE_JS_1900_OFFSET = INITIAL_JS_DAY.getTime() - INITIAL_1900_DAY.getTime();

export const mdyDateRegexp = /^\d{1,2}(\/|-|\s)\d{1,2}((\/|-|\s)\d{1,4})?$/;
export const ymdDateRegexp = /^\d{3,4}(\/|-|\s)\d{1,2}(\/|-|\s)\d{1,2}$/;
export const timeRegexp = /((\d+(:\d+)?(:\d+)?\s*(AM|PM))|(\d+:\d+(:\d+)?))$/;

const CACHE: Record<string, InternalDate | null> = {};

export function parseDateTime(str: string): InternalDate | null {
  if (str in CACHE) {
    return CACHE[str];
  }
  const date = _parseDateTime(str);
  CACHE[str] = date;
  return date;
}

function _parseDateTime(str: string): InternalDate | null {
  str = str.trim();

  let time;
  const timeMatch = str.match(timeRegexp);
  if (timeMatch) {
    time = parseTime(timeMatch[0]);
    if (time === null) {
      return null;
    }
    str = str.replace(timeMatch[0], "").trim();
  }

  let date;
  const mdyDateMatch = str.match(mdyDateRegexp);
  const ymdDateMatch = str.match(ymdDateRegexp);
  if (mdyDateMatch || ymdDateMatch) {
    let dateMatch;
    if (mdyDateMatch) {
      dateMatch = mdyDateMatch[0];
      date = parseDate(dateMatch, "mdy");
    } else {
      dateMatch = ymdDateMatch![0];
      date = parseDate(dateMatch, "ymd");
    }
    if (date === null) {
      return null;
    }
    str = str.replace(dateMatch, "").trim();
  }

  if (str !== "" || !(date || time)) {
    return null;
  }

  if (date && time) {
    return {
      value: date.value + time.value,
      format: date.format + " " + (time.format === "hhhh:mm:ss" ? "hh:mm:ss" : time.format),
      jsDate: new Date(
        date.jsDate.getFullYear() + time.jsDate.getFullYear() - 1899,
        date.jsDate.getMonth() + time.jsDate.getMonth() - 11,
        date.jsDate.getDate() + time.jsDate.getDate() - 30,
        date.jsDate.getHours() + time.jsDate.getHours(),
        date.jsDate.getMinutes() + time.jsDate.getMinutes(),
        date.jsDate.getSeconds() + time.jsDate.getSeconds()
      ),
    };
  }

  return date || time;
}

function parseDate(str: string, dateFormat: Format): InternalDate | null {
  const isMDY = dateFormat === "mdy";
  const isYMD = dateFormat === "ymd";
  if (isMDY || isYMD) {
    const parts: string[] = str.split(/\/|-|\s/);
    const monthIndex = isMDY ? 0 : 1;
    const dayIndex = isMDY ? 1 : 2;
    const yearIndex = isMDY ? 2 : 0;
    const month = Number(parts[monthIndex]);
    const day = Number(parts[dayIndex]);
    const leadingZero =
      (parts[monthIndex].length === 2 && month < 10) || (parts[dayIndex].length === 2 && day < 10);
    const year = parts[yearIndex] ? inferYear(parts[yearIndex]) : CURRENT_YEAR;
    const jsDate = new Date(year, month - 1, day);
    const sep = str.match(/\/|-|\s/)![0];
    if (jsDate.getMonth() !== month - 1 || jsDate.getDate() !== day) {
      // invalid date
      return null;
    }
    const delta = jsDate.getTime() - INITIAL_1900_DAY.getTime();

    let format = leadingZero ? `mm${sep}dd` : `m${sep}d`;
    if (parts[yearIndex]) {
      format = isMDY ? format + sep + "yyyy" : "yyyy" + sep + format;
    }
    return {
      value: Math.round(delta / MS_PER_DAY),
      format: format,
      jsDate,
    };
  }
  return null;
}

function inferYear(str: string): number {
  const nbr = Number(str);
  switch (str.length) {
    case 1:
      return CURRENT_MILLENIAL + nbr;
    case 2:
      const offset = CURRENT_MILLENIAL + nbr > CURRENT_YEAR + 10 ? -100 : 0;
      const base = CURRENT_MILLENIAL + offset;
      return base + nbr;
    case 3:
    case 4:
      return nbr;
  }
  return 0;
}

function parseTime(str: string): InternalDate | null {
  str = str.trim();
  if (timeRegexp.test(str)) {
    const isAM = /AM/i.test(str);
    const isPM = /PM/i.test(str);
    const strTime = isAM || isPM ? str.substring(0, str.length - 2).trim() : str;
    const parts: string[] = strTime.split(/:/);
    const isMinutes = parts.length >= 2;
    const isSeconds = parts.length === 3;
    let hours = Number(parts[0]);
    let minutes = isMinutes ? Number(parts[1]) : 0;
    let seconds = isSeconds ? Number(parts[2]) : 0;
    let format = isSeconds ? "hh:mm:ss" : "hh:mm";

    if (isAM || isPM) {
      format += " a";
    } else if (!isMinutes) {
      return null;
    }

    if (hours >= 12 && isAM) {
      hours -= 12;
    } else if (hours < 12 && isPM) {
      hours += 12;
    }

    minutes += Math.floor(seconds / 60);
    seconds %= 60;
    hours += Math.floor(minutes / 60);
    minutes %= 60;

    if (hours >= 24) {
      format = "hhhh:mm:ss";
    }

    const jsDate = new Date(1899, 11, 30, hours, minutes, seconds);

    return {
      value: hours / 24 + minutes / 1440 + seconds / 86400,
      format: format,
      jsDate: jsDate,
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Conversion
// -----------------------------------------------------------------------------

export function numberToJsDate(value: number): Date {
  const truncValue = Math.trunc(value);
  let date = new Date(truncValue * MS_PER_DAY - DATE_JS_1900_OFFSET);

  let time = value - truncValue;
  time = time < 0 ? 1 + time : time;

  const hours = Math.round(time * 24);
  const minutes = Math.round((time - hours / 24) * 24 * 60);
  const seconds = Math.round((time - hours / 24 - minutes / 24 / 60) * 24 * 60 * 60);

  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(seconds);

  return date;
}

export function jsDateToRoundNumber(date: Date): number {
  const delta = date.getTime() - INITIAL_1900_DAY.getTime();
  return Math.round(delta / MS_PER_DAY);
}

/** Return the number of days in the current month of the given date */
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isLastDayOfMonth(date: Date): boolean {
  return getDaysInMonth(date) === date.getDate();
}

/**
 * Add a certain number of months to a date. This will adapt the month number, and possibly adapt
 * the day of the month to keep it in the month.
 *
 * For example "31/12/2020" minus one month will be "30/11/2020", and not "31/11/2020"
 *
 * @param keepEndOfMonth if true, if the given date was the last day of a month, the returned date will
 *          also always be the last day of a month.
 */
export function addMonthsToDate(date: Date, months: number, keepEndOfMonth: boolean): Date {
  const yStart = date.getFullYear();
  const mStart = date.getMonth();
  const dStart = date.getDate();
  const jsDate = new Date(yStart, mStart + months);

  if (keepEndOfMonth && dStart === getDaysInMonth(date)) {
    jsDate.setDate(getDaysInMonth(jsDate));
  } else if (dStart > getDaysInMonth(jsDate)) {
    // 31/03 minus one month should be 28/02, not 31/02
    jsDate.setDate(getDaysInMonth(jsDate));
  } else {
    jsDate.setDate(dStart);
  }

  return jsDate;
}

function isLeapYear(year: number): boolean {
  const _year = Math.trunc(year);
  return (_year % 4 === 0 && _year % 100 != 0) || _year % 400 == 0;
}

export function getYearFrac(startDate: number, endDate: number, _dayCountConvention: number) {
  if (startDate === endDate) {
    return 0;
  }

  if (startDate > endDate) {
    const stack = endDate;
    endDate = startDate;
    startDate = stack;
  }

  const jsStartDate = numberToJsDate(startDate);
  const jsEndDate = numberToJsDate(endDate);
  let dayStart = jsStartDate.getDate();
  let dayEnd = jsEndDate.getDate();
  const monthStart = jsStartDate.getMonth(); // january is 0
  const monthEnd = jsEndDate.getMonth(); // january is 0
  const yearStart = jsStartDate.getFullYear();
  const yearEnd = jsEndDate.getFullYear();

  let yearsStart = 0;
  let yearsEnd = 0;

  switch (_dayCountConvention) {
    // 30/360 US convention --------------------------------------------------
    case 0:
      if (dayStart === 31) dayStart = 30;
      if (dayStart === 30 && dayEnd === 31) dayEnd = 30;
      // If jsStartDate is the last day of February
      if (monthStart === 1 && dayStart === (isLeapYear(yearStart) ? 29 : 28)) {
        dayStart = 30;
        // If jsEndDate is the last day of February
        if (monthEnd === 1 && dayEnd === (isLeapYear(yearEnd) ? 29 : 28)) {
          dayEnd = 30;
        }
      }
      yearsStart = yearStart + (monthStart * 30 + dayStart) / 360;
      yearsEnd = yearEnd + (monthEnd * 30 + dayEnd) / 360;
      break;

    // actual/actual convention ----------------------------------------------
    case 1:
      let daysInYear = 365;

      const isSameYear = yearStart === yearEnd;
      const isOneDeltaYear = yearStart + 1 === yearEnd;
      const isMonthEndBigger = monthStart < monthEnd;
      const isSameMonth = monthStart === monthEnd;
      const isDayEndBigger = dayStart < dayEnd;

      // |-----|  <-- one Year
      // 'A' is start date
      // 'B' is end date

      if (
        (!isSameYear && !isOneDeltaYear) ||
        (!isSameYear && isMonthEndBigger) ||
        (!isSameYear && isSameMonth && isDayEndBigger)
      ) {
        // |---A-|-----|-B---|  <-- !isSameYear && !isOneDeltaYear
        // |---A-|----B|-----|  <-- !isSameYear && isMonthEndBigger
        // |---A-|---B-|-----|  <-- !isSameYear && isSameMonth && isDayEndBigger

        let countYears = 0;
        let countDaysInYears = 0;
        for (let y = yearStart; y <= yearEnd; y++) {
          countYears++;
          countDaysInYears += isLeapYear(y) ? 366 : 365;
        }
        daysInYear = countDaysInYears / countYears;
      } else if (!isSameYear) {
        // |-AF--|B----|-----|
        if (isLeapYear(yearStart) && monthStart < 2) {
          daysInYear = 366;
        }

        // |--A--|FB---|-----|
        if (isLeapYear(yearEnd) && (monthEnd > 1 || (monthEnd === 1 && dayEnd === 29))) {
          daysInYear = 366;
        }
      } else {
        // remaining cases:
        //
        // |-F-AB|-----|-----|
        // |AB-F-|-----|-----|
        // |A-F-B|-----|-----|

        // if February 29 occurs between date1 (exclusive) and date2 (inclusive)
        // daysInYear --> 366

        if (isLeapYear(yearStart)) {
          daysInYear = 366;
        }
      }

      yearsStart = startDate / daysInYear;
      yearsEnd = endDate / daysInYear;
      break;

    // actual/360 convention -------------------------------------------------
    case 2:
      yearsStart = startDate / 360;
      yearsEnd = endDate / 360;
      break;

    // actual/365 convention -------------------------------------------------
    case 3:
      yearsStart = startDate / 365;
      yearsEnd = endDate / 365;
      break;

    // 30/360 European convention --------------------------------------------
    case 4:
      if (dayStart === 31) dayStart = 30;
      if (dayEnd === 31) dayEnd = 30;
      yearsStart = yearStart + (monthStart * 30 + dayStart) / 360;
      yearsEnd = yearEnd + (monthEnd * 30 + dayEnd) / 360;
      break;
  }

  return yearsEnd - yearsStart;
}
