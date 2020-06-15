// HELPERS

import {
  parseNumber,
  isNumber,
  parseDateTime,
  numberToDate,
  toNativeDate,
  InternalDate,
} from "../helpers/index";
import { _lt } from "../translation";

const expectNumberValueError = (value: string) =>
  _lt(
    `The function [[FUNCTION_NAME]] expects a number value, but '${value}' is a string, and cannot be coerced to a number.`
  );

export function toNumber(value: any): number {
  if (typeNumber(value)) {
    return numberValue(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    if (isNumber(value) || value === "") {
      return parseNumber(value);
    }
    const date = parseDateTime(value);
    if (date) {
      return date.value;
    }
    throw new Error(expectNumberValueError(value));
  }
  return value || 0;
}

export function strictToNumber(value: any): number {
  if (value === "") {
    throw new Error(expectNumberValueError(value));
  }
  return toNumber(value);
}

export function visitNumbers(args: IArguments | any[], cb: (arg: number) => void): void {
  for (let n of args) {
    if (Array.isArray(n)) {
      for (let i of n) {
        for (let j of i) {
          if (typeNumber(j)) {
            cb(numberValue(j));
          }
        }
      }
    } else {
      cb(strictToNumber(n));
    }
  }
}
export function typeNumber(value: any): boolean {
  // Normal case
  if (typeof value === "number") {
    return true;
  }
  // InternalDate case
  if (typeof value === "object" && value !== null) {
    return true;
  }
  return false;
}

export function numberValue(value: number | InternalDate) {
  return typeof value === "number" ? value : value.value;
}

function visitNumbersTextAs0(args: IArguments | any[], cb: (arg: number) => void): void {
  for (let n of args) {
    if (Array.isArray(n)) {
      for (let i of n) {
        for (let j of i) {
          if (j !== undefined && j !== null) {
            if (typeNumber(j)) {
              cb(numberValue(j));
            } else if (typeof j === "boolean") {
              cb(toNumber(j));
            } else {
              cb(0);
            }
          }
        }
      }
    } else {
      cb(toNumber(n));
    }
  }
}

export function visitAny(arg: any, cb: (a: any) => void): void {
  if (Array.isArray(arg)) {
    for (let col of arg) {
      for (let cell of col) {
        cb(cell);
      }
    }
  } else {
    cb(arg);
  }
}

export function visitAnys(
  args: IArguments | any[],
  rangeCb: (a: any) => boolean,
  argCb: (a: any) => boolean
): void {
  for (let arg of args) {
    if (Array.isArray(arg)) {
      for (let col of arg) {
        for (let cell of col) {
          if (!rangeCb(cell)) return;
        }
      }
    } else {
      if (!argCb(arg)) return;
    }
  }
}

export function reduceArgs<T>(
  args: IArguments | any[],
  cb: (acc: T, a: any) => T,
  initialValue: T
): T {
  let val = initialValue;
  for (let arg of args) {
    visitAny(arg, (a) => {
      val = cb(val, a);
    });
  }
  return val;
}

export function reduceNumbers<T>(
  args: IArguments | any[],
  cb: (acc: T, a: any) => T,
  initialValue: T
): T {
  let val = initialValue;
  visitNumbers(args, (a) => {
    val = cb(val, a);
  });
  return val;
}

export function reduceNumbersTextAs0<T>(
  args: IArguments | any[],
  cb: (acc: T, a: any) => T,
  initialValue: T
): T {
  let val = initialValue;
  visitNumbersTextAs0(args, (a) => {
    val = cb(val, a);
  });
  return val;
}

export function toString(value: any): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeNumber(value)) {
    return numberValue(value).toString();
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return "";
}

const expectBooleanValueError = (value: string) =>
  _lt(
    `The function [[FUNCTION_NAME]] expects a boolean value, but '${value}' is a text, and cannot be coerced to a number.`
  );

export function toBoolean(value: any): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value) {
      let uppercaseVal = value.toUpperCase();
      if (uppercaseVal === "TRUE") {
        return true;
      }
      if (uppercaseVal === "FALSE") {
        return false;
      }
      throw new Error(expectBooleanValueError(value));
    } else {
      return false;
    }
  }
  if (typeNumber(value)) {
    return numberValue(value) ? true : false;
  }
  return false;
}

export function strictToBoolean(value: any): boolean {
  if (value === "") {
    throw new Error(expectBooleanValueError(value));
  }
  return toBoolean(value);
}

export function visitBooleans(args: IArguments, cb: (a: boolean) => boolean): void {
  visitAnys(
    args,
    (cell) => {
      if (typeof cell === "boolean") {
        return cb(cell);
      }
      if (typeNumber(cell)) {
        return cb(numberValue(cell) ? true : false);
      }
      return true;
    },
    (arg) => (arg !== null ? cb(strictToBoolean(arg)) : true)
  );
}

export function toDate(date: any): Date {
  if (typeof date === "object" && date !== null) {
    return toNativeDate(date);
  }
  if (typeof date === "string") {
    let result = parseDateTime(date);
    if (result !== null && result.jsDate) {
      return result.jsDate;
    }
  }
  return numberToDate(toNumber(date));
}

// -----------------------------------------------------------------------------
// CRITERION FUNCTIONS
// -----------------------------------------------------------------------------

type Operator = ">" | ">=" | "<" | "<=" | "<>" | "=";
interface Predicate {
  operator: Operator;
  operand: any;
  regexp?: RegExp;
}

function getPredicate(descr: string, isQuery: boolean): Predicate {
  let operator: Operator;
  let operand: any;

  let subString = descr.substring(0, 2);

  if (subString === "<=" || subString === ">=" || subString === "<>") {
    operator = subString;
    operand = descr.substring(2);
  } else {
    subString = descr.substring(0, 1);
    if (subString === "<" || subString === ">" || subString === "=") {
      operator = subString;
      operand = descr.substring(1);
    } else {
      operator = "=";
      operand = descr;
    }
  }

  const date = parseDateTime(operand);
  if (date) {
    operand = date.value;
  } else if (isNumber(operand)) {
    operand = toNumber(operand);
  } else if (operand === "TRUE" || operand === "FALSE") {
    operand = toBoolean(operand);
  }

  const result: Predicate = { operator, operand };

  if (typeof operand === "string") {
    if (isQuery) {
      operand += "*";
    }
    result.regexp = operandToRegExp(operand);
  }

  return result;
}

function operandToRegExp(operand: string): RegExp {
  let exp = "";
  let predecessor = "";
  for (let char of operand) {
    if (char === "?" && predecessor !== "~") {
      exp += ".";
    } else if (char === "*" && predecessor !== "~") {
      exp += ".*";
    } else {
      if (char === "*" || char === "?") {
        //remove "~"
        exp = exp.slice(0, -1);
      }
      if (["^", ".", "[", "]", "$", "(", ")", "*", "+", "?", "|", "{", "}", "\\"].includes(char)) {
        exp += "\\";
      }
      exp += char;
    }
    predecessor = char;
  }
  return new RegExp("^" + exp + "$", "i");
}

function evaluatePredicate(value: any, criterion: Predicate): boolean {
  const { operator, operand } = criterion;
  const val = typeNumber(value) ? numberValue(value) : value;

  if (typeof operand === "number" && operator === "=") {
    return toString(val) === toString(operand);
  }

  if (operator === "<>" || operator === "=") {
    let result: boolean;
    if (typeof val === typeof operand) {
      if (criterion.regexp) {
        result = criterion.regexp.test(val);
      } else {
        result = val === operand;
      }
    } else {
      result = false;
    }
    return operator === "=" ? result : !result;
  }

  if (typeof val === typeof operand) {
    switch (operator) {
      case "<":
        return val < operand;
      case ">":
        return val > operand;
      case "<=":
        return val <= operand;
      case ">=":
        return val >= operand;
    }
  }
  return false;
}

/**
 * Functions used especially for predicate evaluation on ranges.
 *
 * Take ranges with same dimensions and take predicates, one for each range.
 * For (i, j) coordinates, if all elements with coordinates (i, j) of each
 * range correspond to the associated predicate, then the function uses a callback
 * function with the parameters "i" and "j".
 *
 * Syntax:
 * visitMatchingRanges([range1, predicate1, range2, predicate2, ...], cb(i,j), likeSelection)
 *
 * - range1 (range): The range to check against predicate1.
 * - predicate1 (string): The pattern or test to apply to range1.
 * - range2: (range, optional, repeatable) ranges to check.
 * - predicate2 (string, optional, repeatable): Additional pattern or test to apply to range2.
 *
 * - cb(i: number, j: number) => void: the callback function.
 *
 * - isQuery (boolean) indicates if the comparison with a string should be done as a SQL-like query.
 * (Ex1 isQuery = true, predicate = "abc", element = "abcde": predicate match the element),
 * (Ex2 isQuery = false, predicate = "abc", element = "abcde": predicate not match the element).
 * (Ex3 isQuery = true, predicate = "abc", element = "abc": predicate match the element),
 * (Ex4 isQuery = false, predicate = "abc", element = "abc": predicate match the element).
 */
export function visitMatchingRanges(
  args: IArguments | any[],
  cb: (i: number, j: number) => void,
  isQuery: boolean = false
): void {
  const countArg = args.length;

  if (countArg % 2 === 1) {
    throw new Error(
      _lt(`Function [[FUNCTION_NAME]] expects criteria_range and criterion to be in pairs.`)
    );
  }

  const dimRow = args[0].length;
  const dimCol = args[0][0].length;

  let predicates: Predicate[] = [];

  for (let i = 0; i < countArg - 1; i += 2) {
    const criteriaRange = args[i];

    if (criteriaRange.length !== dimRow || criteriaRange[0].length !== dimCol) {
      throw new Error(
        _lt(`Function [[FUNCTION_NAME]] expects criteria_range to have the same dimension`)
      );
    }

    const description = toString(args[i + 1]);
    predicates.push(getPredicate(description, isQuery));
  }

  for (let i = 0; i < dimRow; i++) {
    for (let j = 0; j < dimCol; j++) {
      let validatedPredicates = true;
      for (let k = 0; k < countArg - 1; k += 2) {
        const criteriaValue = args[k][i][j];
        const criterion = predicates[k / 2];
        validatedPredicates = evaluatePredicate(criteriaValue, criterion);
        if (!validatedPredicates) {
          break;
        }
      }
      if (validatedPredicates) {
        cb(i, j);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// COMMON FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Perform a dichotomic search and return the index of the nearest match less than
 * or equal to the target. If all values in the range are greater than the target,
 * -1 is returned.
 * If the range is not in sorted order, an incorrect value might be returned.
 *
 * Example:
 * - [3, 6, 10], 3 => 0
 * - [3, 6, 10], 6 => 1
 * - [3, 6, 10], 9 => 1
 * - [3, 6, 10], 42 => 2
 * - [3, 6, 10], 2 => -1
 */
export function dichotomicPredecessorSearch(range: any[], target: any): number {
  const typeofTarget = typeNumber(target) ? "number" : typeof target;
  const targetValue = typeNumber(target) ? numberValue(target) : target;
  let min = 0;
  let max = range.length - 1;
  let avg = Math.ceil((min + max) / 2);
  let current = range[avg];
  current = typeNumber(current) ? numberValue(current) : current;
  while (max - min > 0) {
    if (typeofTarget === typeof current && current <= targetValue) {
      min = avg;
    } else {
      max = avg - 1;
    }
    avg = Math.ceil((min + max) / 2);
    current = range[avg];
    current = typeNumber(current) ? numberValue(current) : current;
  }
  if (targetValue < current || typeofTarget !== typeof current) {
    // all values in the range are greater than the target, -1 is returned.
    return -1;
  }
  return avg;
}

/**
 * Perform a dichotomic search and return the index of the nearest match more than
 * or equal to the target. If all values in the range are smaller than the target,
 * -1 is returned.
 * If the range is not in sorted order, an incorrect value might be returned.
 *
 * Example:
 * - [10, 6, 3], 3 => 2
 * - [10, 6, 3], 6 => 1
 * - [10, 6, 3], 9 => 0
 * - [10, 6, 3], 42 => -1
 * - [10, 6, 3], 2 => 2
 */
export function dichotomicSuccessorSearch(range: any[], target: any): number {
  const typeofTarget = typeNumber(target) ? "number" : typeof target;
  const targetValue = typeNumber(target) ? numberValue(target) : target;
  let min = 0;
  let max = range.length - 1;
  let avg = Math.floor((min + max) / 2);
  let current = range[avg];
  current = typeNumber(current) ? numberValue(current) : current;
  while (max - min > 0) {
    if (typeofTarget === typeof current && targetValue >= current) {
      max = avg;
    } else {
      min = avg + 1;
    }
    avg = Math.floor((min + max) / 2);
    current = range[avg];
    current = typeNumber(current) ? numberValue(current) : current;
  }
  if (targetValue > current || typeofTarget !== typeof current) {
    return avg - 1;
  }
  return avg;
}
