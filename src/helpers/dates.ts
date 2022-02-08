// -----------------------------------------------------------------------------
// Date Type
// -----------------------------------------------------------------------------

import { Format, FormattedValue } from "../types";

/**
 * All Spreadsheet dates are internally stored as an object with two values:
 * - value (number), which represent the number of day till 30/12/1899
 * - format (string), which keep the information on how the date was defined
 */
export interface InternalDate {
  value: number;
  format: Format;
  jsDate?: Date;
}

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

const CURRENT_MILLENIAL = 2000; // note: don't forget to update this in 2999
const CURRENT_YEAR = new Date().getFullYear();
const INITIAL_1900_DAY = new Date(1899, 11, 30) as any;
const INITIAL_JS_DAY = new Date(0) as any;
const DATE_JS_1900_OFFSET = INITIAL_JS_DAY - INITIAL_1900_DAY;

export const mdyDateRegexp = /^\d{1,2}(\/|-|\s)\d{1,2}((\/|-|\s)\d{1,4})?$/;
export const ymdDateRegexp = /^\d{3,4}(\/|-|\s)\d{1,2}(\/|-|\s)\d{1,2}$/;
export const timeRegexp = /((\d+(:\d+)?(:\d+)?\s*(AM|PM))|(\d+:\d+(:\d+)?))$/;

export function parseDateTime(str: string): InternalDate | null {
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
    const delta = (jsDate as any) - INITIAL_1900_DAY;

    let format = leadingZero ? `mm${sep}dd` : `m${sep}d`;
    if (parts[yearIndex]) {
      format = isMDY ? format + sep + "yyyy" : "yyyy" + sep + format;
    }
    return {
      value: Math.round(delta / 86400000),
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
  let date = new Date(truncValue * 86400 * 1000 - DATE_JS_1900_OFFSET);

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

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

export function formatDateTime(internalDate: InternalDate): FormattedValue {
  // TODO: unify the format functions for date and datetime
  // This requires some code to 'parse' or 'tokenize' the format, keep it in a
  // cache, and use it in a single mapping, that recognizes the special list
  // of tokens dd,d,m,y,h, ... and preserves the rest

  const dateTimeFormat = internalDate.format;
  const jsDate = internalDate.jsDate || numberToJsDate(internalDate.value);
  const indexH = dateTimeFormat.indexOf("h");
  let strDate: FormattedValue = "";
  let strTime: FormattedValue = "";
  if (indexH > 0) {
    strDate = formatJSDate(jsDate, dateTimeFormat.substring(0, indexH - 1));
    strTime = formatJSTime(jsDate, dateTimeFormat.substring(indexH));
  } else if (indexH === 0) {
    strTime = formatJSTime(jsDate, dateTimeFormat);
  } else if (indexH < 0) {
    strDate = formatJSDate(jsDate, dateTimeFormat);
  }
  return strDate + (strDate && strTime ? " " : "") + strTime;
}

function formatJSDate(jsDate: Date, format: Format): FormattedValue {
  const sep = format.match(/\/|-|\s/)![0];
  const parts = format.split(sep);
  return parts
    .map((p) => {
      switch (p) {
        case "d":
          return jsDate.getDate();
        case "dd":
          return jsDate.getDate().toString().padStart(2, "0");
        case "m":
          return jsDate.getMonth() + 1;
        case "mm":
          return String(jsDate.getMonth() + 1).padStart(2, "0");
        case "yyyy":
          return jsDate.getFullYear();
        default:
          throw new Error(`invalid format: ${format}`);
      }
    })
    .join(sep);
}

function formatJSTime(jsDate: Date, format: Format): FormattedValue {
  let parts = format.split(/:|\s/);

  const dateHours = jsDate.getHours();
  const isMeridian = parts[parts.length - 1] === "a";
  let hours = dateHours;
  let meridian = "";
  if (isMeridian) {
    hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    meridian = dateHours >= 12 ? " PM" : " AM";
    parts.pop();
  }

  return (
    parts
      .map((p) => {
        switch (p) {
          case "hhhh":
            const helapsedHours = Math.floor(
              (jsDate.getTime() - INITIAL_1900_DAY) / (60 * 60 * 1000)
            );
            return helapsedHours.toString();
          case "hh":
            return hours.toString().padStart(2, "0");
          case "mm":
            return jsDate.getMinutes().toString().padStart(2, "0");
          case "ss":
            return jsDate.getSeconds().toString().padStart(2, "0");
          default:
            throw new Error(`invalid format: ${format}`);
        }
      })
      .join(":") + meridian
  );
}
