import { NEWLINE } from "../constants";

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
/**
 * This helper function can be used as a type guard when filtering arrays.
 * const foo: number[] = [1, 2, undefined, 4].filter(isDefined)
 */
export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
