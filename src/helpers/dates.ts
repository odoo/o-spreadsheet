// -----------------------------------------------------------------------------
// Date Type
// -----------------------------------------------------------------------------

import { CellValue, Format, Locale } from "../types";
import { isDefined } from "./misc";

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

type DateFormatType = "mdy" | "ymd" | "dmy";
interface DateParts {
  year: string | undefined;
  month: string | undefined;
  day: string | undefined;
  dateString: string;
  type: DateFormatType;
}

/**
 * A DateTime object that can be used to manipulate spreadsheet dates.
 * Conceptually, a spreadsheet date is simply a number with a date format,
 * and it is timezone-agnostic.
 * This DateTime object consistently uses UTC time to represent a naive date and time.
 */
export class DateTime {
  private jsDate: Date;
  constructor(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0) {
    this.jsDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, 0));
  }

  static fromTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    return new DateTime(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
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
    return this.jsDate.getUTCFullYear();
  }

  getMonth() {
    return this.jsDate.getUTCMonth();
  }

  getQuarter() {
    return Math.floor(this.getMonth() / 3) + 1;
  }

  getDate() {
    return this.jsDate.getUTCDate();
  }

  getDay() {
    return this.jsDate.getUTCDay();
  }

  getHours() {
    return this.jsDate.getUTCHours();
  }

  getMinutes() {
    return this.jsDate.getUTCMinutes();
  }

  getSeconds() {
    return this.jsDate.getUTCSeconds();
  }

  setFullYear(year: number) {
    return this.jsDate.setUTCFullYear(year);
  }

  setMonth(month: number) {
    return this.jsDate.setUTCMonth(month);
  }

  setDate(date: number) {
    return this.jsDate.setUTCDate(date);
  }

  setHours(hours: number) {
    return this.jsDate.setUTCHours(hours);
  }

  setMinutes(minutes: number) {
    return this.jsDate.setUTCMinutes(minutes);
  }

  setSeconds(seconds: number) {
    return this.jsDate.setUTCSeconds(seconds);
  }
}

type ReadonlyDateTime = Readonly<
  Omit<DateTime, "setSeconds" | "setMinutes" | "setHours" | "setDate" | "setMonth" | "setFullYear">
>;

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

export const INITIAL_1900_DAY = new DateTime(1899, 11, 30);
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CURRENT_MILLENIAL = 2000; // note: don't forget to update this in 2999
const CURRENT_YEAR = DateTime.now().getFullYear();
const CURRENT_MONTH = DateTime.now().getMonth();
const INITIAL_JS_DAY = DateTime.fromTimestamp(0);
const DATE_JS_1900_OFFSET = INITIAL_JS_DAY.getTime() - INITIAL_1900_DAY.getTime();

export const mdyDateRegexp = /^\d{1,2}(\/|-|\s)\d{1,2}((\/|-|\s)\d{1,4})?$/;
export const ymdDateRegexp = /^\d{3,4}(\/|-|\s)\d{1,2}(\/|-|\s)\d{1,2}$/;

const dateSeparatorsRegex = /\/|-|\s/;
const dateRegexp = /^(\d{1,4})[\/-\s](\d{1,4})([\/-\s](\d{1,4}))?$/;

export const timeRegexp = /((\d+(:\d+)?(:\d+)?\s*(AM|PM))|(\d+:\d+(:\d+)?))$/;

/** Convert a value number representing a date, or return undefined if it isn't possible */
export function valueToDateNumber(value: CellValue, locale: Locale): number | undefined {
  switch (typeof value) {
    case "number":
      return value;
    case "string":
      if (isDateTime(value, locale)) {
        return parseDateTime(value, locale)?.value;
      }
      return !value || isNaN(Number(value)) ? undefined : Number(value);
    default:
      return undefined;
  }
}

export function isDateTime(str: string, locale: Locale): boolean {
  return parseDateTime(str, locale) !== null;
}

const CACHE: Map<Locale, Map<string, InternalDate | null>> = new Map();

export function parseDateTime(str: string, locale: Locale): InternalDate | null {
  if (!CACHE.has(locale)) {
    CACHE.set(locale, new Map());
  }
  if (!CACHE.get(locale)!.has(str)) {
    CACHE.get(locale)!.set(str, _parseDateTime(str, locale));
  }
  return CACHE.get(locale)!.get(str)!;
}

function _parseDateTime(str: string, locale: Locale): InternalDate | null {
  str = str.trim();

  let time: InternalDate | null = null;
  const timeMatch = str.match(timeRegexp);
  if (timeMatch) {
    time = parseTime(timeMatch[0]);
    if (time === null) {
      return null;
    }
    str = str.replace(timeMatch[0], "").trim();
  }

  let date: InternalDate | null = null;
  const dateParts = getDateParts(str, locale);
  if (dateParts) {
    const separator = dateParts.dateString.match(dateSeparatorsRegex)![0];
    date = parseDate(dateParts, separator);
    if (date === null) {
      return null;
    }
    str = str.replace(dateParts.dateString, "").trim();
  }

  if (str !== "" || !(date || time)) {
    return null;
  }

  if (date && date.jsDate && time && time.jsDate) {
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

/**
 * Returns the parts (day/month/year) of a date string corresponding to the given locale.
 *
 * - A string "xxxx-xx-xx" will be parsed as "y-m-d" no matter the locale.
 * - A string "xx-xx-xxxx" will be parsed as "m-d-y" for mdy locale, and "d-m-y" for ymd and dmy locales.
 * - A string "xx-xx-xx" will be "y-m-d" for ymd locale, "d-m-y" for dmy locale, "m-d-y" for mdy locale.
 * - A string "xxxx-xx" will be parsed as "y-m" no matter the locale.
 * - A string "xx-xx" will be parsed as "m-d" for mdy and ymd locales, and "d-m" for dmy locale.
 */
function getDateParts(dateString: string, locale: Locale): DateParts | null {
  const match = dateString.match(dateRegexp);
  if (!match) {
    return null;
  }

  const [, part1, part2, , part3] = match;

  if (part1.length > 2 && part3 && part3.length > 2) {
    return null;
  }

  if (part1.length > 2) {
    return { year: part1, month: part2, day: part3, dateString, type: "ymd" };
  }

  const localeDateType = getLocaleDateFormatType(locale);
  if (!part3) {
    if (part2.length > 2) {
      // e.g. 11/2023
      return { month: part1, year: part2, day: undefined, dateString, type: localeDateType };
    }
    if (localeDateType === "dmy") {
      return { day: part1, month: part2, year: part3, dateString, type: "dmy" };
    }
    return { month: part1, day: part2, year: part3, dateString, type: "mdy" };
  }

  if (part3.length > 2) {
    if (localeDateType === "mdy") {
      return { month: part1, day: part2, year: part3, dateString, type: "mdy" };
    }
    return { day: part1, month: part2, year: part3, dateString, type: "dmy" };
  }

  if (localeDateType === "mdy") {
    return { month: part1, day: part2, year: part3, dateString, type: "mdy" };
  }
  if (localeDateType === "ymd") {
    return { year: part1, month: part2, day: part3, dateString, type: "ymd" };
  }
  if (localeDateType === "dmy") {
    return { day: part1, month: part2, year: part3, dateString, type: "dmy" };
  }
  return null;
}

function getLocaleDateFormatType(locale: Locale): DateFormatType {
  switch (locale.dateFormat[0]) {
    case "d":
      return "dmy";
    case "m":
      return "mdy";
    case "y":
      return "ymd";
  }
  throw new Error("Invalid date format in locale");
}

function parseDate(parts: DateParts, separator: string): InternalDate | null {
  let { year: yearStr, month: monthStr, day: dayStr } = parts;
  const month = inferMonth(monthStr);
  const day = inferDay(dayStr);
  const year = inferYear(yearStr);

  if (year === null || month === null || day === null) {
    return null;
  }

  // month + 1: months are 0-indexed in JS
  const leadingZero =
    (monthStr?.length === 2 && month + 1 < 10) || (dayStr?.length === 2 && day < 10);
  const fullYear = yearStr?.length !== 2;

  const jsDate = new DateTime(year, month, day);
  if (jsDate.getMonth() !== month || jsDate.getDate() !== day) {
    // invalid date
    return null;
  }
  const delta = jsDate.getTime() - INITIAL_1900_DAY.getTime();

  const format = getFormatFromDateParts(parts, separator, leadingZero, fullYear);

  return {
    value: Math.round(delta / MS_PER_DAY),
    format: format,
    jsDate,
  };
}

function getFormatFromDateParts(
  parts: DateParts,
  sep: string,
  leadingZero: boolean,
  fullYear: boolean
): Format {
  const yearFmt = parts.year ? (fullYear ? "yyyy" : "yy") : undefined;
  const monthFmt = parts.month ? (leadingZero ? "mm" : "m") : undefined;
  const dayFmt = parts.day ? (leadingZero ? "dd" : "d") : undefined;

  switch (parts.type) {
    case "mdy":
      return [monthFmt, dayFmt, yearFmt].filter(isDefined).join(sep);
    case "ymd":
      return [yearFmt, monthFmt, dayFmt].filter(isDefined).join(sep);
    case "dmy":
      return [dayFmt, monthFmt, yearFmt].filter(isDefined).join(sep);
  }
}

function inferYear(yearStr: string | undefined): number | null {
  if (!yearStr) {
    return CURRENT_YEAR;
  }
  const nbr = Number(yearStr);
  switch (yearStr.length) {
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
  return null;
}

function inferMonth(monthStr: string | undefined): number | null {
  if (!monthStr) {
    return CURRENT_MONTH;
  }
  const nbr = Number(monthStr);
  if (nbr >= 1 && nbr <= 12) {
    return nbr - 1;
  }
  return null;
}

function inferDay(dayStr: string | undefined): number | null {
  if (!dayStr) {
    return 1;
  }
  const nbr = Number(dayStr);
  if (nbr >= 0 && nbr <= 31) {
    return nbr;
  }
  return null;
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
  return Math.round(jsDateToNumber(date));
}

export function jsDateToNumber(date: DateTime): number {
  const delta = date.getTime() - INITIAL_1900_DAY.getTime();
  return delta / MS_PER_DAY;
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
  return (_year % 4 === 0 && _year % 100 != 0) || _year % 400 === 0;
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

export function areDatesSameDay(startDate: number, endDate: number) {
  return Math.trunc(startDate) === Math.trunc(endDate);
}

export function isDateBetween(date: number, startDate: number, endDate: number) {
  if (startDate > endDate) {
    return isDateBetween(date, endDate, startDate);
  }
  date = Math.trunc(date);
  startDate = Math.trunc(startDate);
  endDate = Math.trunc(endDate);
  return date >= startDate && date <= endDate;
}

/** Check if the first date is strictly before the second date */
export function isDateStrictlyBefore(date: number, dateBefore: number) {
  return Math.trunc(date) < Math.trunc(dateBefore);
}

/** Check if the first date is before or equal to the second date */
export function isDateBefore(date: number, dateBefore: number) {
  return Math.trunc(date) <= Math.trunc(dateBefore);
}

/** Check if the first date is strictly after the second date */
export function isDateStrictlyAfter(date: number, dateAfter: number) {
  return Math.trunc(date) > Math.trunc(dateAfter);
}

/** Check if the first date is after or equal to the second date */
export function isDateAfter(date: number, dateAfter: number) {
  return Math.trunc(date) >= Math.trunc(dateAfter);
}
