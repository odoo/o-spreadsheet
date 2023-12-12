// HELPERS
import { numberToJsDate, parseDateTime } from "../helpers/dates";
import { memoize } from "../helpers/misc";
import { isNumber, parseNumber } from "../helpers/numbers";
import { _t } from "../translation";
import { Arg, CellValue, FPayload, Locale, Matrix, Maybe, isMatrix } from "../types";
import { EvaluationError, errorType } from "../types/errors";

const SORT_TYPES_ORDER = ["number", "string", "boolean", "undefined"];

export function assert(condition: () => boolean, message: string): void {
  if (!condition()) {
    throw new EvaluationError(message);
  }
}

export function inferFormat(data: Arg | undefined): string | undefined {
  if (data === undefined) {
    return undefined;
  }

  if (isMatrix(data)) {
    return data[0][0]?.format;
  }
  return data.format;
}

export function isEvaluationError(error: Maybe<CellValue>): boolean {
  return typeof error === "string" && errorType.has(error);
}

// -----------------------------------------------------------------------------
// FORMAT FUNCTIONS
// -----------------------------------------------------------------------------

const expectNumberValueError = (value: string) =>
  _t(
    "The function [[FUNCTION_NAME]] expects a number value, but '%s' is a string, and cannot be coerced to a number.",
    value
  );

export const expectNumberRangeError = (lowerBound: number, upperBound: number, value: number) =>
  _t(
    "The function [[FUNCTION_NAME]] expects a number value between %s and %s inclusive, but receives %s.",
    lowerBound.toString(),
    upperBound.toString(),
    value.toString()
  );

export const expectStringSetError = (stringSet: string[], value: string) => {
  const stringSetString = stringSet.map((str) => `'${str}'`).join(", ");
  return _t(
    "The function [[FUNCTION_NAME]] has an argument with value '%s'. It should be one of: %s.",
    value,
    stringSetString
  );
};

export function toNumber(data: FPayload | CellValue | undefined, locale: Locale): number {
  const value = toValue(data);
  switch (typeof value) {
    case "number":
      return value;
    case "boolean":
      return value ? 1 : 0;
    case "string":
      if (isNumber(value, locale) || value === "") {
        return parseNumber(value, locale);
      }
      const internalDate = parseDateTime(value, locale);
      if (internalDate) {
        return internalDate.value;
      }
      throw new EvaluationError(expectNumberValueError(value));
    default:
      return 0;
  }
}

export function tryToNumber(
  value: string | number | boolean | null | undefined,
  locale: Locale
): number | undefined {
  try {
    return toNumber(value, locale);
  } catch (e) {
    return undefined;
  }
}

export function toNumberMatrix(data: Arg, argName: string): Matrix<number> {
  return toMatrix(data).map((row) => {
    return row.map((cell) => {
      if (typeof cell.value !== "number") {
        throw new EvaluationError(
          _t(
            "Function [[FUNCTION_NAME]] expects number values for %s, but got a %s.",
            typeof cell.value,
            argName
          )
        );
      }
      return cell.value;
    });
  });
}

export function strictToNumber(data: FPayload | CellValue | undefined, locale: Locale): number {
  const value = toValue(data);
  if (value === "") {
    throw new EvaluationError(expectNumberValueError(value));
  }
  return toNumber(value, locale);
}

export function toInteger(value: FPayload | CellValue | undefined, locale: Locale) {
  return Math.trunc(toNumber(value, locale));
}

export function strictToInteger(value: FPayload | CellValue | undefined, locale: Locale) {
  return Math.trunc(strictToNumber(value, locale));
}

export function assertNumberGreaterThanOrEqualToOne(value: number) {
  assert(
    () => value >= 1,
    _t(
      "The function [[FUNCTION_NAME]] expects a number value to be greater than or equal to 1, but receives %s.",
      value.toString()
    )
  );
}

export function toString(data: FPayload | CellValue | undefined): string {
  const value = toValue(data);
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
const normalizeString = memoize(function normalizeString(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
});

const expectBooleanValueError = (value: string) =>
  _t(
    "The function [[FUNCTION_NAME]] expects a boolean value, but '%s' is a text, and cannot be coerced to a number.",
    value
  );

export function toBoolean(data: FPayload | CellValue | undefined): boolean {
  const value = toValue(data);
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
        throw new EvaluationError(expectBooleanValueError(value));
      } else {
        return false;
      }
    case "number":
      return value ? true : false;
    default:
      return false;
  }
}

function strictToBoolean(data: FPayload | CellValue | undefined): boolean {
  const value = toValue(data);
  if (value === "") {
    throw new EvaluationError(expectBooleanValueError(value));
  }
  return toBoolean(value);
}

export function toJsDate(data: FPayload | CellValue | undefined, locale: Locale): Date {
  const value = toValue(data);
  return numberToJsDate(toNumber(value, locale));
}

function toValue(data: FPayload | CellValue | undefined): CellValue | undefined {
  if (typeof data === "object" && data !== null && "value" in data) {
    if (isEvaluationError(data.value)) {
      throw data;
    }
    return data.value;
  }
  if (isEvaluationError(data)) {
    throw { value: data };
  }
  return data;
}
// -----------------------------------------------------------------------------
// VISIT FUNCTIONS
// -----------------------------------------------------------------------------
function visitArgs<T extends FPayload | CellValue>(
  args: (T | Matrix<T> | undefined)[],
  cellCb: (a: T) => void,
  dataCb: (a: T | undefined) => void
): void {
  for (let arg of args) {
    if (isMatrix(arg)) {
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

export function visitAny(args: Arg[], cb: (a: Maybe<FPayload>) => void): void {
  visitArgs(
    args,
    (cell) => {
      if (isEvaluationError(cell.value)) {
        throw cell;
      }
      cb(cell);
    },
    (arg) => {
      if (isEvaluationError(arg?.value)) {
        throw arg;
      }
      cb(arg);
    }
  );
}

export function visitNumbers(args: Arg[], cb: (arg: number) => void, locale: Locale): void {
  visitArgs(
    args,
    (cell) => {
      const cellValue = cell?.value;
      if (typeof cellValue === "number") {
        cb(cellValue);
      }
      if (isEvaluationError(cellValue)) {
        throw cell;
      }
    },
    (arg) => {
      cb(strictToNumber(arg, locale));
    }
  );
}

// -----------------------------------------------------------------------------
// REDUCE FUNCTIONS
// -----------------------------------------------------------------------------

function reduceArgs<T, M>(
  args: (T | Matrix<T>)[],
  cellCb: (acc: M, a: T) => M,
  dataCb: (acc: M, a: T) => M,
  initialValue: M,
  dir: "rowFirst" | "colFirst" = "rowFirst"
): M {
  let val = initialValue;
  for (let arg of args) {
    if (isMatrix(arg)) {
      // arg is ref to a Cell/Range
      const numberOfCols = arg.length;
      const numberOfRows = arg[0].length;

      if (dir === "rowFirst") {
        for (let row = 0; row < numberOfRows; row++) {
          for (let col = 0; col < numberOfCols; col++) {
            val = cellCb(val, arg[col][row]);
          }
        }
      } else {
        for (let col = 0; col < numberOfCols; col++) {
          for (let row = 0; row < numberOfRows; row++) {
            val = cellCb(val, arg[col][row]);
          }
        }
      }
    } else {
      // arg is set directly in the formula function
      val = dataCb(val, arg);
    }
  }
  return val;
}

export function reduceAny<T, M>(
  args: (T | Matrix<T>)[],
  cb: (acc: M, a: T) => M,
  initialValue: M,
  dir: "rowFirst" | "colFirst" = "rowFirst"
): M {
  return reduceArgs(args, cb, cb, initialValue, dir);
}

export function reduceNumbers(
  args: Arg[],
  cb: (acc: number, a: number) => number,
  initialValue: number,
  locale: Locale
): number {
  return reduceArgs(
    args,
    (acc, arg) => {
      const argValue = arg?.value;
      if (typeof argValue === "number") {
        return cb(acc, argValue);
      } else if (isEvaluationError(argValue)) {
        throw arg;
      }
      return acc;
    },
    (acc, arg) => {
      return cb(acc, strictToNumber(arg, locale));
    },
    initialValue
  );
}

export function reduceNumbersTextAs0(
  args: Arg[],
  cb: (acc: number, a: number) => number,
  initialValue: number,
  locale: Locale
): number {
  return reduceArgs(
    args,
    (acc, arg) => {
      const argValue = arg?.value;
      if (argValue !== undefined && argValue !== null) {
        if (typeof argValue === "number") {
          return cb(acc, argValue);
        } else if (typeof argValue === "boolean") {
          return cb(acc, toNumber(argValue, locale));
        } else if (isEvaluationError(argValue)) {
          throw arg;
        } else {
          return cb(acc, 0);
        }
      }
      return acc;
    },
    (acc, arg) => {
      return cb(acc, toNumber(arg, locale));
    },
    initialValue
  );
}

// -----------------------------------------------------------------------------
// MATRIX FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Generate a matrix of size nColumns x nRows and apply a callback on each position
 */
export function generateMatrix<T>(
  nColumns: number,
  nRows: number,
  callback: (col: number, row: number) => T
): Matrix<T> {
  const returned = Array(nColumns);
  for (let col = 0; col < nColumns; col++) {
    returned[col] = Array(nRows);
    for (let row = 0; row < nRows; row++) {
      returned[col][row] = callback(col, row);
    }
  }
  return returned;
}

export function matrixMap<T, M>(matrix: Matrix<T>, fn: (value: T) => M): Matrix<M> {
  if (matrix.length === 0) {
    return [];
  }
  return generateMatrix(matrix.length, matrix[0].length, (col, row) => fn(matrix[col][row]));
}

export function transposeMatrix<T>(matrix: Matrix<T>): Matrix<T> {
  if (!matrix.length) {
    return [];
  }
  return generateMatrix(matrix[0].length, matrix.length, (i, j) => matrix[j][i]);
}

// -----------------------------------------------------------------------------
// CONDITIONAL EXPLORE FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * This function allows to visit arguments and stop the visit if necessary.
 * It is mainly used to bypass argument evaluation for functions like OR or AND.
 */
function conditionalVisitArgs(
  args: Arg[],
  cellCb: (a: FPayload | undefined) => boolean,
  dataCb: (a: Maybe<FPayload>) => boolean
): void {
  for (let arg of args) {
    if (isMatrix(arg)) {
      // arg is ref to a Cell/Range
      const lenRow = arg.length;
      const lenCol = arg[0].length;
      for (let y = 0; y < lenCol; y++) {
        for (let x = 0; x < lenRow; x++) {
          if (!cellCb(arg[x][y] ?? undefined)) return;
        }
      }
    } else {
      // arg is set directly in the formula function
      if (!dataCb(arg)) return;
    }
  }
}

export function conditionalVisitBoolean(args: Arg[], cb: (a: boolean) => boolean): void {
  return conditionalVisitArgs(
    args,
    (arg) => {
      const argValue = arg?.value;
      if (typeof argValue === "boolean") {
        return cb(argValue);
      }
      if (typeof argValue === "number") {
        return cb(argValue ? true : false);
      }
      if (isEvaluationError(argValue)) {
        throw arg;
      }
      return true;
    },
    (arg) => {
      if (arg !== undefined && arg.value !== null) {
        return cb(strictToBoolean(arg));
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

function getPredicate(descr: string, isQuery: boolean, locale: Locale): Predicate {
  let operator: Operator;
  let operand: Maybe<CellValue>;

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

  if (isNumber(operand, locale)) {
    operand = toNumber(operand, locale);
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

  if (value === undefined || operand === undefined || value === null || operand === null) {
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
  args: Arg[],
  cb: (i: number, j: number) => void,
  locale: Locale,
  isQuery: boolean = false
): void {
  const countArg = args.length;

  if (countArg % 2 === 1) {
    throw new EvaluationError(
      _t("Function [[FUNCTION_NAME]] expects criteria_range and criterion to be in pairs.")
    );
  }

  const dimRow = (args[0] as Matrix<FPayload>).length;
  const dimCol = (args[0] as Matrix<FPayload>)[0].length;

  let predicates: Predicate[] = [];

  for (let i = 0; i < countArg - 1; i += 2) {
    const criteriaRange = args[i];

    if (
      !isMatrix(criteriaRange) ||
      criteriaRange.length !== dimRow ||
      criteriaRange[0].length !== dimCol
    ) {
      throw new EvaluationError(
        _t("Function [[FUNCTION_NAME]] expects criteria_range to have the same dimension")
      );
    }

    const description = toString(args[i + 1] as Maybe<FPayload>);
    predicates.push(getPredicate(description, isQuery, locale));
  }

  for (let i = 0; i < dimRow; i++) {
    for (let j = 0; j < dimCol; j++) {
      let validatedPredicates = true;
      for (let k = 0; k < countArg - 1; k += 2) {
        const criteriaValue = (args[k] as Matrix<FPayload>)[i][j].value;
        const criterion = predicates[k / 2];
        validatedPredicates = evaluatePredicate(criteriaValue ?? undefined, criterion);
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
  target: Maybe<FPayload>,
  mode: "nextGreater" | "nextSmaller" | "strict",
  sortOrder: "asc" | "desc",
  rangeLength: number,
  getValueInData: (range: T, index: number) => CellValue | undefined
): number {
  if (target === undefined || target.value === null) {
    return -1;
  }
  if (isEvaluationError(target.value)) {
    throw target;
  }
  const _target = normalizeValue(target.value);
  const targetType = typeof _target;

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
    currentVal = normalizeValue(getValueInData(data, currentIndex));
    currentType = typeof currentVal;

    // 1 - linear search to find value with the same type
    while (indexLeft < currentIndex && targetType !== currentType) {
      currentIndex--;
      currentVal = normalizeValue(getValueInData(data, currentIndex));
      currentType = typeof currentVal;
    }
    if (currentType !== targetType || currentVal === undefined || currentVal === null) {
      indexLeft = indexMedian + 1;
      continue;
    }

    // 2 - check if value match
    if (mode === "strict" && currentVal === _target) {
      matchVal = currentVal;
      matchValIndex = currentIndex;
    } else if (mode === "nextSmaller" && currentVal <= _target) {
      if (
        matchVal === undefined ||
        matchVal === null ||
        matchVal < currentVal ||
        (matchVal === currentVal && sortOrder === "asc" && matchValIndex! < currentIndex) ||
        (matchVal === currentVal && sortOrder === "desc" && matchValIndex! > currentIndex)
      ) {
        matchVal = currentVal;
        matchValIndex = currentIndex;
      }
    } else if (mode === "nextGreater" && currentVal >= _target) {
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
      (sortOrder === "asc" && currentVal > _target) ||
      (sortOrder === "desc" && currentVal <= _target)
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
  target: Maybe<FPayload> | undefined,
  mode: "nextSmaller" | "nextGreater" | "strict",
  numberOfValues: number,
  getValueInData: (data: T, index: number) => CellValue | undefined,
  reverseSearch = false
): number {
  if (target === undefined || target.value === null) {
    return -1;
  }
  if (isEvaluationError(target.value)) {
    throw target;
  }
  const _target = normalizeValue(target.value);
  const getValue = reverseSearch
    ? (data: T, i: number) => getValueInData(data, numberOfValues - i - 1)
    : getValueInData;

  let closestMatch: CellValue | undefined = undefined;
  let closestMatchIndex = -1;
  for (let i = 0; i < numberOfValues; i++) {
    const value = normalizeValue(getValue(data, i));
    if (value === _target) {
      return reverseSearch ? numberOfValues - i - 1 : i;
    }
    if (mode === "nextSmaller") {
      if (
        (!closestMatch && compareCellValues(_target, value) >= 0) ||
        (compareCellValues(_target, value) >= 0 && compareCellValues(value, closestMatch) > 0)
      ) {
        closestMatch = value;
        closestMatchIndex = i;
      }
    } else if (mode === "nextGreater") {
      if (
        (!closestMatch && compareCellValues(_target, value) <= 0) ||
        (compareCellValues(_target, value) <= 0 && compareCellValues(value, closestMatch) < 0)
      ) {
        closestMatch = value;
        closestMatchIndex = i;
      }
    }
  }

  return reverseSearch ? numberOfValues - closestMatchIndex - 1 : closestMatchIndex;
}

/**
 * Normalize a value.
 * If the cell value is a string, this will set it to lowercase and replacing accent letters with plain letters
 */
function normalizeValue<T>(value: T): T | string {
  return typeof value === "string" ? normalizeString(value) : value;
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

export function toMatrix<T>(data: T | Matrix<T> | undefined): Matrix<T> {
  if (data === undefined) {
    return [[]];
  }
  return isMatrix(data) ? data : [[data]];
}

/**
 * Flatten an array of items, where each item can be a single value or a 2D array, and apply the
 * callback to each element.
 *
 * The 2D array are flattened row first.
 */
export function flattenRowFirst<T, K>(items: Array<T | Matrix<T>>, callback: (val: T) => K): K[] {
  /**/
  return reduceAny(
    items,
    (array: K[], val: T) => {
      array.push(callback(val));
      return array;
    },
    [],
    "rowFirst"
  );
}
