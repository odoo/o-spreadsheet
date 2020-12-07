// HELPERS

import { parseNumber, isNumber } from "../helpers/numbers";
import { parseDateTime, numberToJsDate } from "../functions/dates";
import { _lt } from "../translation";

const expectNumberValueError = (value: string) =>
  _lt(
    `The function [[FUNCTION_NAME]] expects a number value, but '${value}' is a string, and cannot be coerced to a number.`
  );

export function toNumber(value: any): number {
  switch (typeof value) {
    case "number":
      return value;
    case "boolean":
      return value ? 1 : 0;
    case "string":
      if (isNumber(value) || value === "") {
        return parseNumber(value);
      }
      const internalDate = parseDateTime(value);
      if (internalDate) {
        return internalDate.value;
      }
      throw new Error(expectNumberValueError(value));
    default:
      return value || 0;
  }
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
          if (typeof j === "number") {
            cb(j);
          }
        }
      }
    } else {
      cb(strictToNumber(n));
    }
  }
}

function visitNumbersTextAs0(args: IArguments | any[], cb: (arg: number) => void): void {
  for (let n of args) {
    if (Array.isArray(n)) {
      for (let i of n) {
        for (let j of i) {
          if (j !== undefined && j !== null) {
            if (typeof j === "number") {
              cb(j);
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
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return value.toString();
    case "boolean":
      return value ? "TRUE" : "FALSE";
    default:
      return "";
  }
}

const expectBooleanValueError = (value: string) =>
  _lt(
    `The function [[FUNCTION_NAME]] expects a boolean value, but '${value}' is a text, and cannot be coerced to a number.`
  );

export function toBoolean(value: any): boolean {
  switch (typeof value) {
    case "boolean":
      return value;
    case "string":
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
    case "number":
      return value ? true : false;
    default:
      return false;
  }
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
      if (typeof cell === "number") {
        return cb(cell ? true : false);
      }
      return true;
    },
    (arg) => (arg !== null ? cb(strictToBoolean(arg)) : true)
  );
}

export function toJsDate(value: any): Date {
  return numberToJsDate(toNumber(value));
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

  if (isNumber(operand)) {
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

  if (typeof operand === "number" && operator === "=") {
    return toString(value) === toString(operand);
  }

  if (operator === "<>" || operator === "=") {
    let result: boolean;
    if (typeof value === typeof operand) {
      if (criterion.regexp) {
        result = criterion.regexp.test(value);
      } else {
        result = value === operand;
      }
    } else {
      result = false;
    }
    return operator === "=" ? result : !result;
  }

  if (typeof value === typeof operand) {
    switch (operator) {
      case "<":
        return value < operand;
      case ">":
        return value > operand;
      case "<=":
        return value <= operand;
      case ">=":
        return value >= operand;
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
 * - range2: (range, repeatable) ranges to check.
 * - predicate2 (string, repeatable): Additional pattern or test to apply to range2.
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
 * - [3, undefined, 6, undefined, 10], 9 => 2
 * - [3, 6, undefined, undefined, undefined, 10], 2 => -1
 */
export function dichotomicPredecessorSearch(range: any[], target: any): number {
  const targetType = typeof target;

  let valMin: any;
  let valMinIndex: number | undefined = undefined;

  let indexLeft = 0;
  let indexRight = range.length - 1;

  if (typeof range[indexLeft] === targetType && target < range[indexLeft]) {
    return -1;
  }

  if (typeof range[indexRight] === targetType && range[indexRight] <= target) {
    return indexRight;
  }

  let indexMedian: number;
  let currentIndex: number;
  let currentVal: any;
  let currentType: any;

  while (indexRight - indexLeft >= 0) {
    indexMedian = Math.ceil((indexLeft + indexRight) / 2);

    currentIndex = indexMedian;
    currentVal = range[currentIndex];
    currentType = typeof currentVal;

    // 1 - linear search to find value with the same type
    while (indexLeft <= currentIndex && targetType !== currentType) {
      currentIndex--;
      currentVal = range[currentIndex];
      currentType = typeof currentVal;
    }

    // 2 - check if value match
    if (currentType === targetType && currentVal <= target) {
      if (
        valMin === undefined ||
        valMin < currentVal ||
        (valMin === currentVal && valMinIndex! < currentIndex)
      ) {
        valMin = currentVal;
        valMinIndex = currentIndex;
      }
    }

    // 3 - give new indexs for the Binary search
    if (currentType === targetType && currentVal > target) {
      indexRight = currentIndex - 1;
    } else {
      indexLeft = indexMedian + 1;
    }
  }

  // note that valMinIndex could be 0
  return valMinIndex !== undefined ? valMinIndex : -1;
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
 * - [10, undefined, 6, undefined, 3], 9 => 0
 * - [10, 6, undefined, undefined, undefined, 3], 2 => 5
 */
export function dichotomicSuccessorSearch(range: any[], target: any): number {
  const targetType = typeof target;

  let valMax: any;
  let valMaxIndex: number | undefined = undefined;

  let indexLeft = 0;
  let indexRight = range.length - 1;

  if (typeof range[indexLeft] === targetType && target > range[indexLeft]) {
    return -1;
  }

  if (typeof range[indexRight] === targetType && range[indexRight] > target) {
    return indexRight;
  }

  let indexMedian: number;
  let currentIndex: number;
  let currentVal: any;
  let currentType: any;

  while (indexRight - indexLeft >= 0) {
    indexMedian = Math.ceil((indexLeft + indexRight) / 2);
    currentIndex = indexMedian;
    currentVal = range[currentIndex];
    currentType = typeof currentVal;

    // 1 - linear search to find value with the same type
    while (indexLeft <= currentIndex && targetType !== currentType) {
      currentIndex--;
      currentVal = range[currentIndex];
      currentType = typeof currentVal;
    }

    // 2 - check if value match
    if (currentType === targetType && currentVal >= target) {
      if (
        valMax === undefined ||
        valMax > currentVal ||
        (valMax === currentVal && valMaxIndex! > currentIndex)
      ) {
        valMax = currentVal;
        valMaxIndex = currentIndex;
      }
    }

    // 3 - give new indexs for the Binary search
    if (currentType === targetType && currentVal <= target) {
      indexRight = currentIndex - 1;
    } else {
      indexLeft = indexMedian + 1;
    }
  }

  // note that valMaxIndex could be 0
  return valMaxIndex !== undefined ? valMaxIndex : -1;
}
