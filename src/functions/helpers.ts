// HELPERS
import { numberToJsDate, parseDateTime } from "../helpers/dates";
import { isNumber, parseNumber } from "../helpers/numbers";
import { _lt } from "../translation";
import { ArgValue, CellValue, MatrixArgValue, PrimitiveArgValue } from "../types";

const SORT_TYPES_ORDER = ["number", "string", "boolean", "undefined"];

export function assert(condition: () => boolean, message: string): void {
  if (!condition()) {
    throw new Error(message);
  }
}
// -----------------------------------------------------------------------------
// FORMAT FUNCTIONS
// -----------------------------------------------------------------------------

const expectNumberValueError = (value: string) =>
  _lt(
    "The function [[FUNCTION_NAME]] expects a number value, but '%s' is a string, and cannot be coerced to a number.",
    value
  );

export function toNumber(value: string | number | boolean | null | undefined): number {
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
      return 0;
  }
}

export function strictToNumber(value: string | number | boolean | null | undefined): number {
  if (value === "") {
    throw new Error(expectNumberValueError(value));
  }
  return toNumber(value);
}

export function toString(value: string | number | boolean | null | undefined): string {
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

/**
 * Normalize range by setting all the string in the range to lowercase and replacing
 * accent letters with plain letters
 */
export function normalizeRange<T>(range: T[]) {
  return range.map((item) => (typeof item === "string" ? normalizeString(item) : item));
}

/** Normalize string by setting it to lowercase and replacing accent letters with plain letters */
export function normalizeString(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize a value.
 * If the cell value is a string, this will set it to lowercase and replacing accent letters with plain letters
 */
export function normalizeValue<T>(value: T): T | string {
  return typeof value === "string" ? normalizeString(value) : value;
}

const expectBooleanValueError = (value: string) =>
  _lt(
    "The function [[FUNCTION_NAME]] expects a boolean value, but '%s' is a text, and cannot be coerced to a number.",
    value
  );

export function toBoolean(value: string | number | boolean | null | undefined): boolean {
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

function strictToBoolean(value: string | number | boolean | null | undefined): boolean {
  if (value === "") {
    throw new Error(expectBooleanValueError(value));
  }
  return toBoolean(value);
}

export function toJsDate(value: string | number | boolean | null | undefined): Date {
  return numberToJsDate(toNumber(value));
}

// -----------------------------------------------------------------------------
// VISIT FUNCTIONS
// -----------------------------------------------------------------------------
function visitArgs(
  args: ArgValue[],
  cellCb: (a: CellValue | undefined) => void,
  dataCb: (a: PrimitiveArgValue) => void
): void {
  for (let arg of args) {
    if (Array.isArray(arg)) {
      // arg is ref to a Cell/Range
      const lenRow = arg.length;
      const lenCol = arg[0].length;
      for (let y = 0; y < lenCol; y++) {
        for (let x = 0; x < lenRow; x++) {
          cellCb(arg[x][y]);
        }
      }
    } else {
      // arg is set directly in the formula function
      dataCb(arg);
    }
  }
}

export function visitAny(args: ArgValue[], cb: (a: PrimitiveArgValue | undefined) => void): void {
  visitArgs(args, cb, cb);
}

export function visitNumbers(args: ArgValue[], cb: (arg: number) => void): void {
  visitArgs(
    args,
    (cellValue) => {
      if (typeof cellValue === "number") {
        cb(cellValue);
      }
    },
    (argValue) => {
      cb(strictToNumber(argValue));
    }
  );
}

// -----------------------------------------------------------------------------
// REDUCE FUNCTIONS
// -----------------------------------------------------------------------------

function reduceArgs<T>(
  args: ArgValue[],
  cellCb: (acc: T, a: CellValue | undefined) => T,
  dataCb: (acc: T, a: PrimitiveArgValue) => T,
  initialValue: T
): T {
  let val = initialValue;
  for (let arg of args) {
    if (Array.isArray(arg)) {
      // arg is ref to a Cell/Range
      const lenRow = arg.length;
      const lenCol = arg[0].length;
      for (let y = 0; y < lenCol; y++) {
        for (let x = 0; x < lenRow; x++) {
          val = cellCb(val, arg[x][y]);
        }
      }
    } else {
      // arg is set directly in the formula function
      val = dataCb(val, arg);
    }
  }
  return val;
}

export function reduceAny<T>(
  args: ArgValue[],
  cb: (acc: T, a: PrimitiveArgValue | undefined) => T,
  initialValue: T
): T {
  return reduceArgs(args, cb, cb, initialValue);
}

export function reduceNumbers(
  args: ArgValue[],
  cb: (acc: number, a: number) => number,
  initialValue: number
): number {
  return reduceArgs(
    args,
    (acc, ArgValue) => {
      if (typeof ArgValue === "number") {
        return cb(acc, ArgValue);
      }
      return acc;
    },
    (acc, argValue) => {
      return cb(acc, strictToNumber(argValue));
    },
    initialValue
  );
}

export function reduceNumbersTextAs0(
  args: ArgValue[],
  cb: (acc: number, a: number) => number,
  initialValue: number
): number {
  return reduceArgs(
    args,
    (acc, ArgValue) => {
      if (ArgValue !== undefined && ArgValue !== null) {
        if (typeof ArgValue === "number") {
          return cb(acc, ArgValue);
        } else if (typeof ArgValue === "boolean") {
          return cb(acc, toNumber(ArgValue));
        } else {
          return cb(acc, 0);
        }
      }
      return acc;
    },
    (acc, argValue) => {
      return cb(acc, toNumber(argValue));
    },
    initialValue
  );
}

// -----------------------------------------------------------------------------
// CONDITIONAL EXPLORE FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * This function allows to visit arguments and stop the visit if necessary.
 * It is mainly used to bypass argument evaluation for functions like OR or AND.
 */
function conditionalVisitArgs(
  args: ArgValue[],
  cellCb: (a: CellValue | undefined) => boolean,
  dataCb: (a: PrimitiveArgValue) => boolean
): void {
  for (let arg of args) {
    if (Array.isArray(arg)) {
      // arg is ref to a Cell/Range
      const lenRow = arg.length;
      const lenCol = arg[0].length;
      for (let y = 0; y < lenCol; y++) {
        for (let x = 0; x < lenRow; x++) {
          if (!cellCb(arg[x][y])) return;
        }
      }
    } else {
      // arg is set directly in the formula function
      if (!dataCb(arg)) return;
    }
  }
}

export function conditionalVisitBoolean(args: ArgValue[], cb: (a: boolean) => boolean): void {
  return conditionalVisitArgs(
    args,
    (ArgValue) => {
      if (typeof ArgValue === "boolean") {
        return cb(ArgValue);
      }
      if (typeof ArgValue === "number") {
        return cb(ArgValue ? true : false);
      }
      return true;
    },
    (argValue) => {
      if (argValue !== undefined && argValue !== null) {
        return cb(strictToBoolean(argValue));
      }
      return true;
    }
  );
}

// -----------------------------------------------------------------------------
// CRITERION FUNCTIONS
// -----------------------------------------------------------------------------

type Operator = ">" | ">=" | "<" | "<=" | "<>" | "=";
interface Predicate {
  operator: Operator;
  operand: number | string | boolean;
  regexp?: RegExp;
}

function getPredicate(descr: string, isQuery: boolean): Predicate {
  let operator: Operator;
  let operand: PrimitiveArgValue;

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

function evaluatePredicate(value: CellValue | undefined, criterion: Predicate): boolean {
  const { operator, operand } = criterion;

  if (value === undefined || operand === undefined) {
    return false;
  }

  if (typeof operand === "number" && operator === "=") {
    return toString(value) === toString(operand);
  }

  if (operator === "<>" || operator === "=") {
    let result: boolean;
    if (typeof value === typeof operand) {
      if (typeof value === "string" && criterion.regexp) {
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
  args: ArgValue[],
  cb: (i: number, j: number) => void,
  isQuery: boolean = false
): void {
  const countArg = args.length;

  if (countArg % 2 === 1) {
    throw new Error(
      _lt(`Function [[FUNCTION_NAME]] expects criteria_range and criterion to be in pairs.`)
    );
  }

  const dimRow = (args[0] as MatrixArgValue).length;
  const dimCol = (args[0] as MatrixArgValue)[0].length;

  let predicates: Predicate[] = [];

  for (let i = 0; i < countArg - 1; i += 2) {
    const criteriaRange = args[i];

    if (
      !Array.isArray(criteriaRange) ||
      criteriaRange.length !== dimRow ||
      criteriaRange[0].length !== dimCol
    ) {
      throw new Error(
        _lt(`Function [[FUNCTION_NAME]] expects criteria_range to have the same dimension`)
      );
    }

    const description = toString(args[i + 1] as PrimitiveArgValue);
    predicates.push(getPredicate(description, isQuery));
  }

  for (let i = 0; i < dimRow; i++) {
    for (let j = 0; j < dimCol; j++) {
      let validatedPredicates = true;
      for (let k = 0; k < countArg - 1; k += 2) {
        const criteriaValue = (args[k] as MatrixArgValue)[i][j];
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

export function getNormalizedValueFromColumnRange(
  range: MatrixArgValue,
  index: number
): CellValue | undefined {
  return normalizeValue(range[0][index]);
}

export function getNormalizedValueFromRowRange(
  range: MatrixArgValue,
  index: number
): CellValue | undefined {
  return normalizeValue(range[index][0]);
}

/**
 * Perform a dichotomic search on an array and return the index of the nearest match.
 *
 * The array should be sorted, if not an incorrect value might be returned. In the case where multiple
 * element of the array match the target, the method will return the first match if the array is sorted
 * in descending order, and the last match if the array is in ascending order.
 *
 *
 * @param data the array in which to search.
 * @param target the value to search.
 * @param mode "nextGreater/nextSmaller" : return next greater/smaller value if no exact match is found.
 * @param sortOrder whether the array is sorted in ascending or descending order.
 * @param rangeLength the number of elements to consider in the search array.
 * @param getValueInData function returning the element at index i in the search array.
 */
export function dichotomicSearch<T>(
  data: T,
  target: PrimitiveArgValue,
  mode: "nextGreater" | "nextSmaller" | "strict",
  sortOrder: "asc" | "desc",
  rangeLength: number,
  getValueInData: (range: T, index: number) => CellValue | undefined
): number {
  if (target === null || target === undefined) {
    return -1;
  }
  const targetType = typeof target;

  let matchVal: CellValue | undefined = undefined;
  let matchValIndex: number | undefined = undefined;

  let indexLeft = 0;
  let indexRight = rangeLength - 1;

  let indexMedian: number;
  let currentIndex: number;
  let currentVal: CellValue | undefined;
  let currentType: string;

  while (indexRight - indexLeft >= 0) {
    indexMedian = Math.floor((indexLeft + indexRight) / 2);

    currentIndex = indexMedian;
    currentVal = getValueInData(data, currentIndex);
    currentType = typeof currentVal;

    // 1 - linear search to find value with the same type
    while (indexLeft < currentIndex && targetType !== currentType) {
      currentIndex--;
      currentVal = getValueInData(data, currentIndex);
      currentType = typeof currentVal;
    }
    if (currentType !== targetType || currentVal === undefined) {
      indexLeft = indexMedian + 1;
      continue;
    }

    // 2 - check if value match
    if (mode === "strict" && currentVal === target) {
      matchVal = currentVal;
      matchValIndex = currentIndex;
    } else if (mode === "nextSmaller" && currentVal <= target) {
      if (
        matchVal === undefined ||
        matchVal < currentVal ||
        (matchVal === currentVal && sortOrder === "asc" && matchValIndex! < currentIndex) ||
        (matchVal === currentVal && sortOrder === "desc" && matchValIndex! > currentIndex)
      ) {
        matchVal = currentVal;
        matchValIndex = currentIndex;
      }
    } else if (mode === "nextGreater" && currentVal >= target) {
      if (
        matchVal === undefined ||
        matchVal > currentVal ||
        (matchVal === currentVal && sortOrder === "asc" && matchValIndex! < currentIndex) ||
        (matchVal === currentVal && sortOrder === "desc" && matchValIndex! > currentIndex)
      ) {
        matchVal = currentVal;
        matchValIndex = currentIndex;
      }
    }

    // 3 - give new indexes for the Binary search
    if (
      (sortOrder === "asc" && currentVal > target) ||
      (sortOrder === "desc" && currentVal <= target)
    ) {
      indexRight = currentIndex - 1;
    } else {
      indexLeft = indexMedian + 1;
    }
  }

  // note that valMinIndex could be 0
  return matchValIndex !== undefined ? matchValIndex : -1;
}

/**
 * Perform a linear search and return the index of the match.
 * -1 is returned if no value is found.
 *
 * Example:
 * - [3, 6, 10], 3 => 0
 * - [3, 6, 10], 6 => 1
 * - [3, 6, 10], 9 => -1
 * - [3, 6, 10], 2 => -1
 *
 * @param data the array to search in.
 * @param target the value to search in the array.
 * @param mode if "strict" return exact match index. "nextGreater" returns the next greater
 * element from the target and "nextSmaller" the next smaller
 * @param numberOfValues the number of elements to consider in the search array.
 * @param getValueInData function returning the element at index i in the search array.
 * @param reverseSearch if true, search in the array starting from the end.

 */
export function linearSearch<T>(
  data: T,
  target: PrimitiveArgValue | undefined,
  mode: "nextSmaller" | "nextGreater" | "strict",
  numberOfValues: number,
  getValueInData: (data: T, index: number) => CellValue | undefined,
  reverseSearch = false
): number {
  if (target === null || target === undefined) return -1;

  const getValue = reverseSearch
    ? (data: T, i: number) => getValueInData(data, numberOfValues - i - 1)
    : getValueInData;

  let closestMatch: CellValue | undefined = undefined;
  let closestMatchIndex = -1;
  for (let i = 0; i < numberOfValues; i++) {
    const value = getValue(data, i);
    if (value === target) {
      return reverseSearch ? numberOfValues - i - 1 : i;
    }
    if (mode === "nextSmaller") {
      if (
        (!closestMatch && compareCellValues(target, value) >= 0) ||
        (compareCellValues(target, value) >= 0 && compareCellValues(value, closestMatch) > 0)
      ) {
        closestMatch = value;
        closestMatchIndex = i;
      }
    } else if (mode === "nextGreater") {
      if (
        (!closestMatch && compareCellValues(target, value) <= 0) ||
        (compareCellValues(target, value) <= 0 && compareCellValues(value, closestMatch) < 0)
      ) {
        closestMatch = value;
        closestMatchIndex = i;
      }
    }
  }

  return reverseSearch ? numberOfValues - closestMatchIndex - 1 : closestMatchIndex;
}

function compareCellValues(left: CellValue | undefined, right: CellValue | undefined): number {
  let typeOrder = SORT_TYPES_ORDER.indexOf(typeof left) - SORT_TYPES_ORDER.indexOf(typeof right);
  if (typeOrder === 0) {
    if (typeof left === "string" && typeof right === "string") {
      typeOrder = left.localeCompare(right);
    } else if (typeof left === "number" && typeof right === "number") {
      typeOrder = left - right;
    } else if (typeof left === "boolean" && typeof right === "boolean") {
      typeOrder = Number(left) - Number(right);
    }
  }
  return typeOrder;
}
