//------------------------------------------------------------------------------
// Miscellaneous
//------------------------------------------------------------------------------
import { NEWLINE } from "../constants";
import { ConsecutiveIndexes, Lazy, UID } from "../types";
import { SearchOptions } from "../types/find_and_replace";
import { Cloneable, DebouncedFunction } from "./../types/misc";

/**
 * Remove quotes from a quoted string
 * ```js
 * removeStringQuotes('"Hello"')
 * > 'Hello'
 * ```
 */
export function removeStringQuotes(str: string): string {
  if (str[0] === '"') {
    str = str.slice(1);
  }
  if (str[str.length - 1] === '"' && str[str.length - 2] !== "\\") {
    return str.slice(0, str.length - 1);
  }
  return str;
}

function isCloneable<T extends Object>(obj: T | Cloneable<T>): obj is Cloneable<T> {
  return "clone" in obj && obj.clone instanceof Function;
}

/**
 * Escapes a string to use as a literal string in a RegExp.
 * @url https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Deep copy arrays, plain objects and primitive values.
 * Throws an error for other types such as class instances.
 * Sparse arrays remain sparse.
 */
export function deepCopy<T>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};
  switch (typeof obj) {
    case "object": {
      if (obj === null) {
        return obj;
      } else if (isCloneable(obj)) {
        return obj.clone();
      } else if (!(isPlainObject(obj) || obj instanceof Array)) {
        throw new Error("Unsupported type: only objects and arrays are supported");
      }
      for (const key in obj) {
        result[key] = deepCopy(obj[key]);
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
  return typeof obj === "object" && obj?.constructor === Object;
}

/**
 * Sanitize the name of a sheet, by eventually removing quotes
 * @param sheetName name of the sheet, potentially quoted with single quotes
 */
export function getUnquotedSheetName(sheetName: string): string {
  if (sheetName.startsWith("'")) {
    sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
  }
  return sheetName;
}

/**
 * Add quotes around the sheet name if it contains at least one non alphanumeric character
 * '\w' captures [0-9][a-z][A-Z] and _.
 * @param sheetName Name of the sheet
 */
export function getCanonicalSheetName(sheetName: string): string {
  if (sheetName.match(/\w/g)?.length !== sheetName.length) {
    sheetName = `'${sheetName}'`;
  }
  return sheetName;
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

const O_SPREADSHEET_LINK_PREFIX = "o-spreadsheet://";

export function isSheetUrl(url: string) {
  return url.startsWith(O_SPREADSHEET_LINK_PREFIX);
}

export function buildSheetLink(sheetId: UID) {
  return `${O_SPREADSHEET_LINK_PREFIX}${sheetId}`;
}

/**
 * Parse a sheet link and return the sheet id
 */
export function parseSheetUrl(sheetLink: string) {
  if (sheetLink.startsWith(O_SPREADSHEET_LINK_PREFIX)) {
    return sheetLink.substr(O_SPREADSHEET_LINK_PREFIX.length);
  }
  throw new Error(`${sheetLink} is not a valid sheet link`);
}

/**
 * This helper function can be used as a type guard when filtering arrays.
 * const foo: number[] = [1, 2, undefined, 4].filter(isDefined)
 */
export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}

export function isNotNull<T>(argument: T | null): argument is T {
  return argument !== null;
}

/**
 * Check if all the values of an object, and all the values of the objects inside of it, are undefined.
 */
export function isObjectEmptyRecursive<T extends object>(argument: T | undefined): boolean {
  if (argument === undefined) return true;
  return Object.values(argument).every((value) =>
    typeof value === "object" ? isObjectEmptyRecursive(value) : !value
  );
}

/**
 * Get the id of the given item (its key in the given dictionnary).
 * If the given item does not exist in the dictionary, it creates one with a new id.
 */
export function getItemId<T>(item: T, itemsDic: { [id: number]: T }) {
  for (const key in itemsDic) {
    if (deepEquals(itemsDic[key], item)) {
      return parseInt(key, 10);
    }
  }

  // Generate new Id if the item didn't exist in the dictionary
  const ids = Object.keys(itemsDic);
  const maxId = ids.length === 0 ? 0 : Math.max(...ids.map((id) => parseInt(id, 10)));

  itemsDic[maxId + 1] = item;
  return maxId + 1;
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * Also decorate the argument function with two methods: stopDebounce and isDebouncePending.
 *
 * Inspired by https://davidwalsh.name/javascript-debounce-function
 */
export function debounce<T extends (...args: any) => void>(
  func: T,
  wait: number,
  immediate?: boolean
): DebouncedFunction<T> {
  let timeout: any | undefined = undefined;
  const debounced = function (this: any): void {
    const context = this;
    const args = arguments;
    function later() {
      timeout = undefined;
      if (!immediate) {
        func.apply(context, args);
      }
    }
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
  debounced.isDebouncePending = () => timeout !== undefined;
  debounced.stopDebounce = () => {
    clearTimeout(timeout);
  };
  return debounced as DebouncedFunction<T>;
}

/*
 * Concatenate an array of strings.
 */
export function concat(chars: string[]): string {
  // ~40% faster than chars.join("")
  let output = "";
  for (let i = 0, len = chars.length; i < len; i++) {
    output += chars[i];
  }
  return output;
}

/**
 * Lazy value computed by the provided function.
 */
export function lazy<T>(fn: (() => T) | T): Lazy<T> {
  let isMemoized = false;
  let memo: T | undefined;
  const lazyValue = () => {
    if (!isMemoized) {
      memo = fn instanceof Function ? fn() : fn;
      isMemoized = true;
    }
    return memo!;
  };
  lazyValue.map = (callback) => lazy(() => callback(lazyValue()));
  return lazyValue as Lazy<T>;
}

/**
 * Find the next defined value after the given index in an array of strings. If there is no defined value
 * after the index, return the closest defined value before the index. Return an empty string if no
 * defined value was found.
 *
 */
export function findNextDefinedValue(arr: string[], index: number): string {
  let value = arr.slice(index).find((val) => val);
  if (!value) {
    value = arr
      .slice(0, index)
      .reverse()
      .find((val) => val);
  }
  return value || "";
}

/** Get index of first header added by an ADD_COLUMNS_ROWS command */
export function getAddHeaderStartIndex(position: "before" | "after", base: number): number {
  return position === "after" ? base + 1 : base;
}

/**
 * Compares two objects.
 */
export function deepEquals(o1: any, o2: any): boolean {
  if (o1 === o2) return true;
  if ((o1 && !o2) || (o2 && !o1)) return false;
  if (typeof o1 !== typeof o2) return false;
  if (typeof o1 !== "object") return o1 === o2;

  // Objects can have different keys if the values are undefined
  for (const key in o2) {
    if (!(key in o1) && o2[key] !== undefined) {
      return false;
    }
  }

  for (const key in o1) {
    if (typeof o1[key] !== typeof o2[key]) return false;
    if (typeof o1[key] === "object") {
      if (!deepEquals(o1[key], o2[key])) return false;
    } else {
      if (o1[key] !== o2[key]) return false;
    }
  }

  return true;
}

/** Check if the given array contains all the values of the other array. */
export function includesAll<T>(arr: T[], values: T[]): boolean {
  return values.every((value) => arr.includes(value));
}

/**
 * Return an object with all the keys in the object that have a falsy value removed.
 */
export function removeFalsyAttributes<T extends Object | undefined | null>(obj: T): T {
  if (!obj) return obj;
  const cleanObject = { ...obj };
  Object.keys(cleanObject).forEach((key) => !cleanObject[key] && delete cleanObject[key]);
  return cleanObject;
}

/**
 * Equivalent to "\s" in regexp, minus the new lines characters
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes
 */
const whiteSpaceSpecialCharacters = [
  "\t",
  "\f",
  "\v",
  String.fromCharCode(parseInt("00a0", 16)),
  String.fromCharCode(parseInt("1680", 16)),
  String.fromCharCode(parseInt("2000", 16)),
  String.fromCharCode(parseInt("200a", 16)),
  String.fromCharCode(parseInt("2028", 16)),
  String.fromCharCode(parseInt("2029", 16)),
  String.fromCharCode(parseInt("202f", 16)),
  String.fromCharCode(parseInt("205f", 16)),
  String.fromCharCode(parseInt("3000", 16)),
  String.fromCharCode(parseInt("feff", 16)),
];
const whiteSpaceRegexp = new RegExp(whiteSpaceSpecialCharacters.join("|") + "|(\r\n|\r|\n)", "g");

/**
 * Replace all the special spaces in a string (non-breaking, tabs, ...) by normal spaces, and all the
 * different newlines types by \n.
 */
export function replaceSpecialSpaces(text: string | undefined): string {
  if (!text) return "";
  if (!whiteSpaceRegexp.test(text)) return text;
  return text.replace(whiteSpaceRegexp, (match, newLine) => (newLine ? NEWLINE : " "));
}

/** Move the item at the starting index to the target index in an array */
export function moveItemToIndex<T>(array: T[], startIndex: number, targetIndex: number): T[] {
  array = [...array];
  const item = array[startIndex];
  array.splice(startIndex, 1);
  array.splice(targetIndex, 0, item);
  return array;
}

/**
 * Determine if the numbers are consecutive.
 */
export function isConsecutive(iterable: Iterable<number>): boolean {
  const array = Array.from(iterable).sort((a, b) => a - b); // sort numerically rather than lexicographically
  for (let i = 1; i < array.length; i++) {
    if (array[i] - array[i - 1] !== 1) {
      return false;
    }
  }
  return true;
}

export class JetSet<T> extends Set<T> {
  addMany(iterable: Iterable<T>): this {
    for (const element of iterable) {
      super.add(element);
    }
    return this;
  }
  deleteMany(iterable: Iterable<T>): boolean {
    let wasDeleted = false;
    for (const element of iterable) {
      wasDeleted ||= super.delete(element);
    }
    return wasDeleted;
  }
}

/**
 * Creates a version of the function that's memoized on the value of its first
 * argument, if any.
 */
export function memoize<T extends any[], U>(func: (...args: T) => U): (...args: T) => U {
  const cache = new Map<any, U>();
  const funcName = func.name ? func.name + " (memoized)" : "memoized";
  return {
    [funcName](...args: T) {
      if (!cache.has(args[0])) {
        cache.set(args[0], func(...args));
      }
      return cache.get(args[0])!;
    },
  }[funcName];
}

export function removeIndexesFromArray<T>(array: readonly T[], indexes: number[]): T[] {
  return array.filter((_, index) => !indexes.includes(index));
}

export function insertItemsAtIndex<T>(array: readonly T[], items: T[], index: number): T[] {
  const newArray = [...array];
  newArray.splice(index, 0, ...items);
  return newArray;
}

export function trimContent(content: string): string {
  const contentLines = content.split("\n");
  return contentLines.map((line) => line.replace(/\s+/g, " ").trim()).join("\n");
}

export function isNumberBetween(value: number, min: number, max: number): boolean {
  if (min > max) {
    return isNumberBetween(value, max, min);
  }
  return value >= min && value <= max;
}

/**
 * Get a Regex for the find & replace that matches the given search string and options.
 */
export function getSearchRegex(searchStr: string, searchOptions: SearchOptions): RegExp {
  let searchValue = escapeRegExp(searchStr);
  const flags = !searchOptions.matchCase ? "i" : "";
  if (searchOptions.exactMatch) {
    searchValue = `^${searchValue}$`;
  }
  return RegExp(searchValue, flags);
}
