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
  readonly jsDate?: ReadonlyDateTime;
}

export class DateTime {
  private jsDate: Date;
  constructor(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0) {
    this.jsDate = new Date(year, month, day, hours, minutes, seconds, 0);
  }

  static fromTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    return new DateTime(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    );
  }

  static now() {
    const now = new Date();
    return new DateTime(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
  }

  toString() {
    return this.jsDate.toString();
  }

  toLocaleDateString() {
    return this.jsDate.toLocaleDateString();
  }

  getTime() {
    return this.jsDate.getTime();
  }

  getFullYear() {
    return this.jsDate.getFullYear();
  }

  getMonth() {
    return this.jsDate.getMonth();
  }

  getDate() {
    return this.jsDate.getDate();
  }

  getDay() {
    return this.jsDate.getDay();
  }

  getHours() {
    return this.jsDate.getHours();
  }

  getMinutes() {
    return this.jsDate.getMinutes();
  }

  getSeconds() {
    return this.jsDate.getSeconds();
  }

  setFullYear(year: number) {
    this.jsDate.setFullYear(year);
  }

  setDate(date: number) {
    this.jsDate.setDate(date);
  }

  setHours(hours: number) {
    this.jsDate.setHours(hours);
  }

  setMinutes(minutes: number) {
    this.jsDate.setMinutes(minutes);
  }

  setSeconds(seconds: number) {
    this.jsDate.setSeconds(seconds);
  }
}

type ReadonlyDateTime = Readonly<
  Omit<DateTime, "setSeconds" | "setMinutes" | "setHours" | "setDate" | "setFullYear">
>;

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

export const INITIAL_1900_DAY = new DateTime(1899, 11, 30);
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CURRENT_MILLENIAL = 2000; // note: don't forget to update this in 2999
const CURRENT_YEAR = DateTime.now().getFullYear();
const INITIAL_JS_DAY = DateTime.fromTimestamp(0);
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
      jsDate: new DateTime(
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
    const jsDate = new DateTime(year, month - 1, day);
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

    const jsDate = new DateTime(1899, 11, 30, hours, minutes, seconds);

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

export function numberToJsDate(value: number): DateTime {
  const truncValue = Math.trunc(value);
  let date = DateTime.fromTimestamp(truncValue * MS_PER_DAY - DATE_JS_1900_OFFSET);

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

export function jsDateToRoundNumber(date: DateTime): number {
  const delta = date.getTime() - INITIAL_1900_DAY.getTime();
  return Math.round(delta / MS_PER_DAY);
}

/** Return the number of days in the current month of the given date */
export function getDaysInMonth(date: DateTime): number {
  return new DateTime(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isLastDayOfMonth(date: DateTime): boolean {
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
export function addMonthsToDate(date: DateTime, months: number, keepEndOfMonth: boolean): DateTime {
  const yStart = date.getFullYear();
  const mStart = date.getMonth();
  const dStart = date.getDate();
  const jsDate = new DateTime(yStart, mStart + months, 1);

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

/**
 * Get the number of whole months between two dates.
 * e.g.
 *  2002/01/01 -> 2002/02/01 = 1 month,
 *  2002/01/01 -> 2003/02/01 = 13 months
 * @param startDate
 * @param endDate
 * @returns
 */
export function getTimeDifferenceInWholeMonths(startDate: DateTime, endDate: DateTime) {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    endDate.getMonth() -
    startDate.getMonth();
  return startDate.getDate() > endDate.getDate() ? months - 1 : months;
}

export function getTimeDifferenceInWholeDays(startDate: DateTime, endDate: DateTime) {
  const startUtc = startDate.getTime();
  const endUtc = endDate.getTime();
  return Math.floor((endUtc - startUtc) / MS_PER_DAY);
}

export function getTimeDifferenceInWholeYears(startDate: DateTime, endDate: DateTime) {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const monthStart = startDate.getMonth();
  const monthEnd = endDate.getMonth();
  const dateStart = startDate.getDate();
  const dateEnd = endDate.getDate();
  const isEndMonthDateBigger =
    monthEnd > monthStart || (monthEnd === monthStart && dateEnd >= dateStart);
  return isEndMonthDateBigger ? years : years - 1;
}

export function areTwoDatesWithinOneYear(startDate: number, endDate: number) {
  return getYearFrac(startDate, endDate, 1) < 1;
}
