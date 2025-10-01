//------------------------------------------------------------------------------
// Miscellaneous
//------------------------------------------------------------------------------
import { ConsecutiveIndexes, Style } from "@odoo/o-spreadsheet-engine";
import { Cloneable } from "@odoo/o-spreadsheet-engine/types";
export {
  escapeRegExp,
  getCanonicalSymbolName,
  getUnquotedSheetName,
  memoize,
  replaceNewLines,
  specialWhiteSpaceRegexp,
  TokenizingChars,
  unquote,
  whiteSpaceCharacters,
} from "@odoo/o-spreadsheet-engine/helpers/misc";

const sanitizeSheetNameRegex = new RegExp(FORBIDDEN_SHEETNAME_CHARS_IN_EXCEL_REGEX, "g");

function isCloneable<T extends Object>(obj: T | Cloneable<T>): obj is Cloneable<T> {
  return "clone" in obj && obj.clone instanceof Function;
}

/**
 * Deep copy arrays, plain objects and primitive values.
 * Throws an error for other types such as class instances.
 * Sparse arrays remain sparse.
 */
export function deepCopy<T>(obj: T): T {
  switch (typeof obj) {
    case "object": {
      if (obj === null) {
        return obj;
      } else if (isCloneable(obj)) {
        return obj.clone();
      } else if (!(isPlainObject(obj) || obj instanceof Array)) {
        throw new Error("Unsupported type: only objects and arrays are supported");
      }
      const result: any = Array.isArray(obj) ? new Array(obj.length) : {};
      if (Array.isArray(obj)) {
        for (let i = 0, len = obj.length; i < len; i++) {
          if (i in obj) {
            result[i] = deepCopy(obj[i]);
          }
        }
      } else {
        for (const key in obj) {
          result[key] = deepCopy(obj[key]);
        }
      }
      return result;
    }
    case "number":
    case "string":
    case "boolean":
    case "function":
    case "undefined":
      return obj;
    default:
      throw new Error(`Unsupported type: ${typeof obj}`);
  }
}

/**
 * Check if the object is a plain old javascript object.
 */
function isPlainObject(obj: unknown): boolean {
  return (
    typeof obj === "object" &&
    obj !== null &&
    // obj.constructor can be undefined when there's no prototype (`Object.create(null, {})`)
    (obj?.constructor === Object || obj?.constructor === undefined)
  );
}

/** Replace the excel-excluded characters of a sheetName */
export function sanitizeSheetName(sheetName: string, replacementChar: string = " "): string {
  return sheetName.replace(sanitizeSheetNameRegex, replacementChar);
}

export function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

/**
 * Create a range from start (included) to end (excluded).
 * range(10, 13) => [10, 11, 12]
 * range(2, 8, 2) => [2, 4, 6]
 */
export function range(start: number, end: number, step = 1) {
  if (end <= start && step > 0) {
    return [];
  }
  if (step === 0) {
    throw new Error("range() step must not be zero");
  }
  const length = Math.ceil(Math.abs((end - start) / step));
  const array: number[] = Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = start + i * step;
  }
  return array;
}

/**
 * Groups consecutive numbers.
 * The input array is assumed to be sorted
 * @param numbers
 */
export function groupConsecutive(numbers: number[]): ConsecutiveIndexes[] {
  return numbers.reduce((groups, currentRow, index, rows) => {
    if (Math.abs(currentRow - rows[index - 1]) === 1) {
      const lastGroup = groups[groups.length - 1];
      lastGroup.push(currentRow);
    } else {
      groups.push([currentRow]);
    }
    return groups;
  }, [] as ConsecutiveIndexes[]);
}

/**
 * Create one generator from two generators by linking
 * each item of the first generator to the next item of
 * the second generator.
 *
 * Let's say generator G1 yields A, B, C and generator G2 yields X, Y, Z.
 * The resulting generator of `linkNext(G1, G2)` will yield A', B', C'
 * where `A' = A & {next: Y}`, `B' = B & {next: Z}` and `C' = C & {next: undefined}`
 * @param generator
 * @param nextGenerator
 */
export function* linkNext<T>(
  generator: Generator<T>,
  nextGenerator: Generator<T>
): Generator<T & { next?: T }> {
  nextGenerator.next();
  for (const item of generator) {
    const nextItem = nextGenerator.next();
    yield {
      ...item,
      next: nextItem.done ? undefined : nextItem.value,
    };
  }
}

export function isBoolean(str: string): boolean {
  const upperCased = str.toUpperCase();
  return upperCased === "TRUE" || upperCased === "FALSE";
}

const MARKDOWN_LINK_REGEX = /^\[(.+)\]\((.+)\)$/;
//link must start with http or https
//https://stackoverflow.com/a/3809435/4760614
const WEB_LINK_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

export function isMarkdownLink(str: string): boolean {
  return MARKDOWN_LINK_REGEX.test(str);
}

/**
 * Check if the string is a web link.
 * e.g. http://odoo.com
 */
export function isWebLink(str: string): boolean {
  return WEB_LINK_REGEX.test(str);
}

/**
 * Build a markdown link from a label and an url
 */
export function markdownLink(label: string, url: string): string {
  return `[${label}](${url})`;
}

export function parseMarkdownLink(str: string): { url: string; label: string } {
  const matches = str.match(MARKDOWN_LINK_REGEX) || [];
  const label = matches[1];
  const url = matches[2];
  if (!label || !url) {
    throw new Error(`Could not parse markdown link ${str}.`);
  }
  return {
    label,
    url,
  };
}

/** Get index of first header added by an ADD_COLUMNS_ROWS command */
export function getAddHeaderStartIndex(position: "before" | "after", base: number): number {
  return position === "after" ? base + 1 : base;
}

/**
 * Similar to transposing and array, but with POJOs instead of arrays. Useful, for example, when manipulating
 * a POJO grid[col][row] and you want to transpose it to grid[row][col].
 *
 * The resulting object is created such as result[key1][key2] = pojo[key2][key1]
 */
export function transpose2dPOJO<T>(
  pojo: Record<string, Record<string, T>>
): Record<string, Record<string, T>> {
  const result: Record<string, Record<string, T>> = {};
  for (const key in pojo) {
    for (const subKey in pojo[key]) {
      if (!result[subKey]) {
        result[subKey] = {};
      }
      result[subKey][key] = pojo[key][subKey];
    }
  }
  return result;
}

export function getUniqueText(
  text: string,
  texts: string[],
  options: {
    compute?: (text: string, increment: number) => string;
    start?: number;
    computeFirstOne?: boolean;
  } = {}
): string {
  const compute = options.compute ?? ((text, i) => `${text} (${i})`);
  const computeFirstOne = options.computeFirstOne ?? false;
  let i = options.start ?? 1;
  let newText = computeFirstOne ? compute(text, i) : text;
  while (texts.includes(newText)) {
    newText = compute(text, i++);
  }
  return newText;
}

export function isFormula(content: string): boolean {
  return content.startsWith("=") || content.startsWith("+");
}

// TODO: we should make make ChartStyle be the same as Style sometime ...
export function chartStyleToCellStyle(style: ChartStyle): Style {
  return {
    bold: style.bold,
    italic: style.italic,
    fontSize: style.fontSize,
    textColor: style.color,
    align: style.align,
  };
}
