import { toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// Date Type
// -----------------------------------------------------------------------------

import { _lt } from "../translation";

/**
 * All Spreadsheet dates are internally stored as an object with two values:
 * - value (number), which represent the number of day till 30/12/1899
 * - format (string), which keep the information on how the date was defined
 */
export interface InternalDate {
  value: number;
  format: string;
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

const mdyDateRegexp = /^\d{1,2}(\/|-|\s)\d{1,2}((\/|-|\s)\d{1,4})?$/;
const ymdDateRegexp = /^\d{3,4}(\/|-|\s)\d{1,2}(\/|-|\s)\d{1,2}$/;

export function parseDate(str: string): InternalDate | null {
  str = str.trim();
  const isMDY = mdyDateRegexp.test(str);
  const isYMD = !isMDY && ymdDateRegexp.test(str);
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

const timeRegexp = /^\d+(:\d+)?(:\d+)?\s*(AM|PM)?$/i;

export function parseTime(str: string): InternalDate | null {
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
export function toNativeDate(date: any): Date {
  if (typeof date === "object" && date !== null) {
    if (!date.jsDate) {
      date.jsDate = new Date(date.value * 86400 * 1000 - DATE_JS_1900_OFFSET);
    }
    return date.jsDate;
  }

  if (typeof date === "string") {
    let result = parseDate(date);
    if (result !== null && result.jsDate) {
      return result.jsDate;
    }
    result = parseTime(date);
    if (result !== null && result.jsDate) {
      return result.jsDate;
    }
  }

  return new Date(toNumber(date) * 86400 * 1000 - DATE_JS_1900_OFFSET);
}

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

function formatJSDate(date: Date, format: string): string {
  const sep = format.match(/\/|-|\s/)![0];
  const parts = format.split(sep);
  return parts
    .map((p) => {
      switch (p) {
        case "d":
          return date.getDate();
        case "dd":
          return date.getDate().toString().padStart(2, "0");
        case "m":
          return date.getMonth() + 1;
        case "mm":
          return String(date.getMonth() + 1).padStart(2, "0");
        case "yyyy":
          return date.getFullYear();
        default:
          throw new Error(_lt("invalid format"));
      }
    })
    .join(sep);
}

export function formatDate(date: InternalDate, format?: string): string {
  return formatJSDate(toNativeDate(date), format || date.format);
}

function formatJSTime(date: Date, format: string): string {
  let parts = format.split(/:|\s/);

  const dateHours = date.getHours();
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
              (date.getTime() - INITIAL_1900_DAY) / (60 * 60 * 1000)
            );
            return helapsedHours.toString();
          case "hh":
            return hours.toString().padStart(2, "0");
          case "mm":
            return date.getMinutes().toString().padStart(2, "0");
          case "ss":
            return date.getSeconds().toString().padStart(2, "0");
          default:
            throw new Error("invalid format");
        }
      })
      .join(":") + meridian
  );
}

export function formatTime(date: InternalDate, format?: string): string {
  return formatJSTime(toNativeDate(date), format || date.format);
}
