import { NEWLINE } from "../constants";
import { DebouncedFunction, Lazy, UID } from "../types";

/**
 * Compares n objects.
 */

export function deepEquals(...o: any[]): boolean {
  if (o.length <= 1) return true;
  for (let index = 1; index < o.length; index++) {
    if (!_deepEquals(o[0], o[index])) return false;
  }
  return true;
}

function _deepEquals(o1: any, o2: any): boolean {
  if (o1 === o2) return true;
  if ((o1 && !o2) || (o2 && !o1)) return false;
  if (typeof o1 !== typeof o2) return false;
  if (typeof o1 !== "object") return false;

  // Objects can have different keys if the values are undefined
  for (const key in o2) {
    if (!(key in o1) && o2[key] !== undefined) {
      return false;
    }
  }

  for (const key in o1) {
    if (typeof o1[key] !== typeof o2[key]) return false;
    if (typeof o1[key] === "object") {
      if (!_deepEquals(o1[key], o2[key])) return false;
    } else {
      if (o1[key] !== o2[key]) return false;
    }
  }

  return true;
}

/**
 * Compares two arrays.
 * For performance reasons, this function is to be preferred
 * to 'deepEquals' in the case we know that the inputs are arrays.
 */
export function deepEqualsArray(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (!deepEquals(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Escapes a string to use as a literal string in a RegExp.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove quotes from a quoted string.
 */
export function unquote(string: string, quoteChar: "'" | '"' = '"'): string {
  if (string.startsWith(quoteChar)) {
    string = string.slice(1);
  }
  if (string.endsWith(quoteChar)) {
    string = string.slice(0, -1);
  }
  return string;
}

/**
 * Sanitize the name of a sheet, by eventually removing quotes.
 */
export function getUnquotedSheetName(sheetName: string): string {
  return unquote(sheetName, "'");
}

/**
 * Add quotes around the sheet name or any symbol name if it contains at least one non alphanumeric character.
 */
export function getCanonicalSymbolName(symbolName: string): string {
  if (symbolName.match(/\w/g)?.length !== symbolName.length) {
    symbolName = `'${symbolName}'`;
  }
  return symbolName;
}

const specialWhiteSpaceSpecialCharacters = [
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

export const specialWhiteSpaceRegexp = new RegExp(
  specialWhiteSpaceSpecialCharacters.join("|"),
  "g"
);
const newLineRegexp = /(\r\n|\r)/g;

export const whiteSpaceCharacters = specialWhiteSpaceSpecialCharacters.concat([" "]);

/**
 * Replace all different newlines characters by \n.
 */
export function replaceNewLines(text: string | undefined): string {
  if (!text) return "";
  return text.replace(newLineRegexp, NEWLINE);
}

/**
 * Creates a version of the function that's memoized on the value of its first argument, if any.
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

export class TokenizingChars {
  private text: string;
  private currentIndex: number = 0;
  current: string;

  constructor(text: string) {
    this.text = text;
    this.current = text[0];
  }

  shift() {
    const current = this.current;
    const next = this.text[++this.currentIndex];
    this.current = next;
    return current;
  }

  advanceBy(length: number) {
    this.currentIndex += length;
    this.current = this.text[this.currentIndex];
  }

  isOver() {
    return this.currentIndex >= this.text.length;
  }

  remaining() {
    return this.text.substring(this.currentIndex);
  }

  currentStartsWith(str: string) {
    if (this.current !== str[0]) {
      return false;
    }
    for (let j = 1; j < str.length; j++) {
      if (this.text[this.currentIndex + j] !== str[j]) {
        return false;
      }
    }
    return true;
  }
}

const O_SPREADSHEET_LINK_PREFIX = "o-spreadsheet://";

/**
 * This helper function can be used as a type guard when filtering arrays.
 * const foo: number[] = [1, 2, undefined, 4].filter(isDefined)
 */
export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
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
    return sheetLink.slice(O_SPREADSHEET_LINK_PREFIX.length);
  }
  throw new Error(`${sheetLink} is not a valid sheet link`);
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
    const args = Array.from(arguments);
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

/**
 * Creates a batched version of a callback so that all calls to it in the same
 * microtick will only call the original callback once.
 *
 * @param callback the callback to batch
 * @returns a batched version of the original callback
 *
 * Copied from odoo/owl repo.
 */
export function batched(callback: () => void): () => void {
  let scheduled = false;
  return async (...args) => {
    if (!scheduled) {
      scheduled = true;
      await Promise.resolve();
      scheduled = false;
      callback(...args);
    }
  };
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

/**
 * Check if the given array contains all the values of the other array.
 * It makes the assumption that both array do not contain duplicates.
 */
export function includesAll<T>(arr: T[], values: T[]): boolean {
  if (arr.length < values.length) {
    return false;
  }

  const set = new Set(arr);
  return values.every((value) => set.has(value));
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

/**
 * Removes the specified indexes from the array.
 * Sparse (empty) elements are transformed to undefined (unless their index is explicitly removed).
 */
export function removeIndexesFromArray<T>(array: readonly T[], indexes: number[]): T[] {
  const toRemove = new Set(indexes);
  const newArray: T[] = [];
  for (let i = 0; i < array.length; i++) {
    if (!toRemove.has(i)) {
      newArray.push(array[i]);
    }
  }
  return newArray;
}

export function insertItemsAtIndex<T>(array: readonly T[], items: T[], index: number): T[] {
  const newArray = [...array];
  newArray.splice(index, 0, ...items);
  return newArray;
}

export function replaceItemAtIndex<T>(array: readonly T[], newItem: T, index: number): T[] {
  const newArray = [...array];
  newArray[index] = newItem;
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
  let searchValue = engineEscapeRegExp(searchStr);
  const flags = !searchOptions.matchCase ? "i" : "";
  if (searchOptions.exactMatch) {
    searchValue = `^${searchValue}$`;
  }
  return RegExp(searchValue, flags);
}

/**
 * Alternative to Math.max that works with large arrays.
 * Typically useful for arrays bigger than 100k elements.
 */
export function largeMax(array: number[]) {
  let len = array.length;

  if (len < 100_000) return Math.max(...array);

  let max: number = -Infinity;
  while (len--) {
    max = array[len] > max ? array[len] : max;
  }
  return max;
}

/**
 * Alternative to Math.min that works with large arrays.
 * Typically useful for arrays bigger than 100k elements.
 */
export function largeMin(array: number[]) {
  let len = array.length;

  if (len < 100_000) return Math.min(...array);

  let min: number = +Infinity;
  while (len--) {
    min = array[len] < min ? array[len] : min;
  }
  return min;
}

/**
 * Remove duplicates from an array.
 *
 * @param array The array to remove duplicates from.
 * @param cb A callback to get an element value.
 */
export function removeDuplicates<T>(array: T[], cb: (a: T) => any = (a) => a): T[] {
  const set = new Set();
  return array.filter((item) => {
    const key = cb(item);
    if (set.has(key)) {
      return false;
    }
    set.add(key);
    return true;
  });
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
