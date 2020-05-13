import { toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// Date Type
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Conversion
// -----------------------------------------------------------------------------
export function toNativeDate(date: any): Date {
  if (typeof date === "object") {
    if (!date.jsDate) {
      date.jsDate = new Date(date.value * 86400 * 1000 - DATE_JS_1900_OFFSET);
    }
    return date.jsDate;
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
          throw new Error("invalid format");
      }
    })
    .join(sep);
}

export function formatDate(date: InternalDate, format?: string): string {
  return formatJSDate(toNativeDate(date), format || date.format);
}
