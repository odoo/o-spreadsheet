import { evaluationResultToDisplayString } from "../helpers/matrix";
import { _t } from "../translation";
import { EvaluationError, NotAvailableError } from "../types/errors";
import { AddFunctionDescription, LazyArg } from "../types/functions";
import { Arg, FunctionResultObject, Matrix, Maybe, UnboundedZone } from "../types/misc";
import { arg } from "./arguments";
import { areSameDimensions, isSingleColOrRow, isSquareMatrix } from "./helper_assert";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";
import {
  flattenRowFirst,
  generateLimitedMatrix2,
  generateMatrix,
  generateSubMatrix,
  isEvaluationError,
  matrixMap,
  toBoolean,
  toInteger,
  toMatrix,
  toMatrix2,
  toNumber,
  toNumberMatrix,
  toString,
  toSubMatrix,
  transposeMatrix,
} from "./helpers";

function stackHorizontally(
  ranges: Arg[],
  options?: { requireSameRowCount?: boolean }
): Matrix<FunctionResultObject> | EvaluationError {
  const matrices = ranges.map(toMatrix);
  const nbRowsArr = matrices.map((m) => m?.[0]?.length ?? 0);
  const nbRows = Math.max(...nbRowsArr);

  if (options?.requireSameRowCount) {
    const firstLength = nbRowsArr[0];
    if (nbRowsArr.some((len) => len !== firstLength)) {
      return new EvaluationError(
        _t(
          "All ranges in [[FUNCTION_NAME]] must have the same number of columns (got %s).",
          nbRowsArr.join(", ")
        )
      );
    }
  }

  const result: Matrix<FunctionResultObject> = [];
  for (const matrix of matrices) {
    for (let col = 0; col < matrix.length; col++) {
      // Fill with nulls if needed
      const array: FunctionResultObject[] = Array(nbRows).fill({ value: null });
      for (let row = 0; row < matrix[col].length; row++) {
        array[row] = matrix[col][row];
      }
      result.push(array);
    }
  }
  return result;
}

function stackVertically(
  ranges: Arg[],
  options?: { requireSameColCount?: boolean }
): Matrix<FunctionResultObject> | EvaluationError {
  const matrices = ranges.map(toMatrix);
  const nbColsArr = matrices.map((m) => m?.length ?? 0);
  const nbCols = Math.max(...nbColsArr);

  if (options?.requireSameColCount) {
    const firstLength = nbColsArr[0];
    if (nbColsArr.some((len) => len !== firstLength)) {
      return new EvaluationError(
        _t(
          "All ranges in [[FUNCTION_NAME]] must have the same number of columns (got %s).",
          nbColsArr.join(", ")
        )
      );
    }
  }

  const nbRows = matrices.reduce((acc, m) => acc + (m?.[0]?.length ?? 0), 0);
  const result: Matrix<FunctionResultObject> = generateMatrix(nbCols, nbRows, () => ({
    value: null,
  }));

  let currentRow = 0;
  for (const matrix of matrices) {
    for (let col = 0; col < matrix.length; col++) {
      for (let row = 0; row < matrix[col].length; row++) {
        result[col][currentRow + row] = matrix[col][row];
      }
    }
    currentRow += matrix[0]?.length ?? 0;
  }

  return result;
}

// -----------------------------------------------------------------------------
// ARRAY.CONSTRAIN
// -----------------------------------------------------------------------------
export const ARRAY_CONSTRAIN = {
  description: _t("Returns a result array constrained to a specific width and height."),
  args: [
    arg("input_range (any, range<any>, lazy)", _t("The range to constrain.")),
    arg("rows (number)", _t("The number of rows in the constrained array.")),
    arg("columns (number)", _t("The number of columns in the constrained array.")),
  ],
  computeArray: function (
    zone: UnboundedZone,
    inputRange: LazyArg,
    rows: Maybe<FunctionResultObject>,
    columns: Maybe<FunctionResultObject>
  ) {
    const _rows = toInteger(rows?.value, this.locale);
    const _columns = toInteger(columns?.value, this.locale);

    if (_rows <= 0) {
      return new EvaluationError(
        _t("The rows argument (%s) must be strictly positive.", _rows.toString())
      );
    }
    if (_columns <= 0) {
      return new EvaluationError(
        _t("The columns argument (%s) must be strictly positive.", _columns.toString())
      );
    }

    return generateLimitedMatrix2(zone, _columns, _rows, inputRange);
  },
  isExported: false,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ARRAY.LITERAL
// -----------------------------------------------------------------------------
export const ARRAY_LITERAL = {
  description: _t(
    "Appends ranges vertically and in sequence to return a larger array. All ranges must have the same number of columns."
  ),
  args: [arg("range (any, range<any>, repeating)", _t("The range to be appended."))],
  computeArray: function (zone: UnboundedZone, ...ranges: Arg[]) {
    // TODO: optimize zone
    return toSubMatrix(zone, stackVertically(ranges, { requireSameColCount: true }));
  },
  isExported: false,
  hidden: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ARRAY.ROW
// -----------------------------------------------------------------------------
export const ARRAY_ROW = {
  description: _t(
    "Appends ranges horizontally and in sequence to return a larger array. All ranges must have the same number of rows."
  ),
  args: [arg("range (any, range<any>, repeating)", _t("The range to be appended."))],
  computeArray: function (zone: UnboundedZone, ...ranges: Arg[]) {
    // TODO: optimize zone
    return toSubMatrix(zone, stackHorizontally(ranges, { requireSameRowCount: true }));
  },
  isExported: false,
  hidden: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CHOOSECOLS
// -----------------------------------------------------------------------------
export const CHOOSECOLS = {
  description: _t("Creates a new array from the selected columns in the existing range."),
  args: [
    arg("array (any, range<any>, lazy)", _t("The array that contains the columns to be returned.")),
    arg(
      "col_num (number, range<number>, repeating)",
      _t("The column index of the column to be returned.")
    ),
  ],
  computeArray: function (zone: UnboundedZone, array: LazyArg, ...columns: Arg[]) {
    const _columns = flattenRowFirst(columns, (item) => toInteger(item?.value, this.locale));

    if (array === undefined) {
      array = () => [[]];
    }

    if (_columns.includes(0)) {
      return new EvaluationError(
        _t("The value of parameter 2 of function [[FUNCTION_NAME]] cannot be zero.")
      );
    }

    const leftIndexes = _columns.map((col) => (col > 0 ? col - 1 : col));

    const result: Matrix<FunctionResultObject> = Array(_columns.length);
    for (
      let widthIndex = zone.left;
      widthIndex < (zone.right === undefined ? leftsIndex.length : zone.right + 1);
      widthIndex++
    ) {
      const left = leftsIndex[widthIndex];
      const subZone = { left, right: left, top: zone.top, bottom: zone.bottom };
      const res = toMatrix(array(subZone));
      if (res.length === 0 || res[0].length === 0) {
        return new EvaluationError(
          _t(
            "Index out of range: The function [[FUNCTION_NAME]] tries to access a column at index (%s) that doesn't match any column.",
            _columns[widthIndex].toString()
          )
        );
      }
      result[widthIndex] = toMatrix2(res, subZone)[0];
    }

    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CHOOSEROWS
// -----------------------------------------------------------------------------
export const CHOOSEROWS = {
  description: _t("Creates a new array from the selected rows in the existing range."),
  args: [
    arg("array (any, range<any>)", _t("The array that contains the rows to be returned.")),
    arg(
      "row_num (number, range<number>, repeating)",
      _t("The row index of the row to be returned.")
    ),
  ],
  computeArray: function (zone: UnboundedZone, array: Arg, ...rows: Arg[]) {
    const _array = toMatrix(array);
    const _rows = flattenRowFirst(rows, (item) => toInteger(item?.value, this.locale));
    const _nbColumns = _array.length;

    const argOutOfRange = _rows.filter((row) => row === 0 || _array[0].length < Math.abs(row));
    if (argOutOfRange.length !== 0) {
      return new EvaluationError(
        _t(
          "The rows arguments must be between -%s and %s (got %s), excluding 0.",
          _array[0].length.toString(),
          _array[0].length.toString(),
          argOutOfRange.join(",")
        )
      );
    }

    return generateSubMatrix(zone, _nbColumns, _rows.length, (col, row) => {
      if (_rows[row] > 0) {
        return _array[col][_rows[row] - 1]; // -1 because columns arguments are 1-indexed
      }
      return _array[col][_array[col].length + _rows[row]];
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EXPAND
// -----------------------------------------------------------------------------
export const EXPAND = {
  description: _t("Expands or pads an array to specified row and column dimensions."),
  args: [
    arg("array (any, range<any>, lazy)", _t("The array to expand.")),
    arg(
      "rows (number)",
      _t("The number of rows in the expanded array. If missing, rows will not be expanded.")
    ),
    arg(
      "columns (number, optional)",
      _t("The number of columns in the expanded array. If missing, columns will not be expanded.")
    ),
    arg("pad_with (any, default=0)", _t("The value with which to pad.")), // @compatibility: on Excel, pad with #N/A
  ],
  computeArray: function (
    zone: UnboundedZone,
    array: LazyArg,
    rows: Maybe<FunctionResultObject>,
    columns: Maybe<FunctionResultObject>,
    padWith: Maybe<FunctionResultObject> = { value: 0 } // TODO : Replace with #N/A errors once it's supported
  ) {
    if (array === undefined) {
      array = () => [[]];
    }

    // depending the zone passed in parameters, array(zone) could reurn error if
    // the zone is out of the bounds of the array. But the goal of this function
    // is to expand the array.
    // So we shouldn't pass the zone to the array closure,
    const subArray = toMatrix(array(zone));

    const subWidth = subArray.length;
    const subHeight = subArray[0].length;

    const realWidth = zone.left + subWidth;
    const realHeight = zone.top + subHeight;

    const _rows = rows !== undefined ? toInteger(rows.value, this.locale) : realHeight;
    const _columns = columns !== undefined ? toInteger(columns.value, this.locale) : realWidth;

    if (_rows < realHeight) {
      return new EvaluationError(
        _t(
          "The rows arguments (%s) must be greater or equal than the number of rows of the array.",
          _rows.toString()
        )
      );
    }

    if (_columns < realWidth) {
      return new EvaluationError(
        _t(
          "The columns arguments (%s) must be greater or equal than the number of columns of the array.",
          _columns.toString()
        )
      );
    }

    const endColIndex = _columns - zone.left;
    const endRowIndex = _rows - zone.top;

    // fill the missing values in the already existing columns
    for (let colIndex = 0; colIndex < subWidth; colIndex++) {
      for (let rowIndex = subHeight; rowIndex < endRowIndex; rowIndex++) {
        subArray[colIndex].push(padWith);
      }
    }

    // fill the missing columns
    for (let colIndex = subWidth; colIndex < endColIndex; colIndex++) {
      const newCol: FunctionResultObject[] = [];
      for (let rowIndex = 0; rowIndex < endRowIndex; rowIndex++) {
        newCol.push(padWith);
      }
      subArray.push(newCol);
    }

    return subArray;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLATTEN
// -----------------------------------------------------------------------------
export const FLATTEN = {
  description: _t("Flattens all the values from one or more ranges into a single column."),
  args: [arg("range (any, range<any>, repeating)", _t("The range to flatten."))],
  computeArray: function (zone: UnboundedZone, ...ranges: Arg[]) {
    return toSubMatrix(zone, [
      flattenRowFirst(ranges, (val) => (val === undefined ? { value: "" } : val)),
    ]);
  },
  isExported: false,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FREQUENCY
// -----------------------------------------------------------------------------
export const FREQUENCY = {
  description: _t("Calculates the frequency distribution of a range."),
  args: [
    arg("data (range<number>)", _t("The array of ranges containing the values to be counted.")),
    arg("classes (number, range<number>)", _t("The range containing the set of classes.")),
  ],
  computeArray: function (
    zone: UnboundedZone,
    data: Matrix<FunctionResultObject>,
    classes: Matrix<FunctionResultObject>
  ) {
    const _data = flattenRowFirst([data], (data) => data.value).filter(
      (val): val is number => typeof val === "number"
    );
    const _classes = flattenRowFirst([classes], (data) => data.value).filter(
      (val): val is number => typeof val === "number"
    );

    /**
     * Returns the frequency distribution of the data in the classes, ie. the number of elements in the range
     * between each classes.
     *
     * For example:
     * - data = [1, 3, 2, 5, 4]
     * - classes = [3, 5, 1]
     *
     * The result will be:
     * - 2 ==> number of elements 1 > el >= 3
     * - 2 ==> number of elements 3 > el >= 5
     * - 1 ==> number of elements <= 1
     * - 0 ==> number of elements > 5
     *
     * @compatibility: GSheet sort the input classes. We do the implemntation of Excel, where we kee the classes unsorted.
     */

    const sortedClasses = _classes
      .map((value, index) => ({ initialIndex: index, value, count: 0 }))
      .sort((a, b) => a.value - b.value);
    sortedClasses.push({ initialIndex: sortedClasses.length, value: Infinity, count: 0 });

    const sortedData = _data.sort((a, b) => a - b);

    let index = 0;
    for (const val of sortedData) {
      while (val > sortedClasses[index].value && index < sortedClasses.length - 1) {
        index++;
      }
      sortedClasses[index].count++;
    }

    const result = sortedClasses
      .sort((a, b) => a.initialIndex - b.initialIndex)
      .map((val) => ({ value: val.count }));
    return toSubMatrix(zone, [result]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// HSTACK
// -----------------------------------------------------------------------------
export const HSTACK = {
  description: _t("Appends ranges horizontally and in sequence to return a larger array."),
  args: [arg("range (any, range<any>, repeating)", _t("The range to be appended."))],
  computeArray: function (zone: UnboundedZone, ...ranges: Arg[]) {
    return toSubMatrix(zone, stackHorizontally(ranges));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MDETERM
// -----------------------------------------------------------------------------
export const MDETERM = {
  description: _t("Returns the matrix determinant of a square matrix."),
  args: [
    arg(
      "square_matrix (number, range<number>)",
      _t(
        "An range with an equal number of rows and columns representing a matrix whose determinant will be calculated."
      )
    ),
  ],
  compute: function (matrix: Arg) {
    const _matrix = toNumberMatrix(matrix, "square_matrix");
    if (!isSquareMatrix(_matrix)) {
      return new EvaluationError(
        _t("The argument square_matrix must have the same number of columns and rows.")
      );
    }
    return { value: invertMatrix(_matrix).determinant };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MINVERSE
// -----------------------------------------------------------------------------
export const MINVERSE = {
  description: _t("Returns the multiplicative inverse of a square matrix."),
  args: [
    arg(
      "square_matrix (number, range<number>)",
      _t(
        "An range with an equal number of rows and columns representing a matrix whose multiplicative inverse will be calculated."
      )
    ),
  ],
  computeArray: function (zone: UnboundedZone, matrix: Arg) {
    const _matrix = toNumberMatrix(matrix, "square_matrix");
    if (!isSquareMatrix(_matrix)) {
      return new EvaluationError(
        _t("The argument square_matrix must have the same number of columns and rows.")
      );
    }
    const { inverted } = invertMatrix(_matrix);
    if (!inverted) {
      return new EvaluationError(_t("The matrix is not invertible."));
    }
    return toSubMatrix(
      zone,
      matrixMap(inverted, (value) => ({ value }))
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MMULT
// -----------------------------------------------------------------------------
export const MMULT = {
  description: _t("Calculates the matrix product of two matrices."),
  args: [
    arg(
      "matrix1 (number, range<number>)",
      _t("The first matrix in the matrix multiplication operation.")
    ),
    arg(
      "matrix2 (number, range<number>)",
      _t("The second matrix in the matrix multiplication operation.")
    ),
  ],
  computeArray: function (zone: UnboundedZone, matrix1: Arg, matrix2: Arg) {
    const _matrix1 = toNumberMatrix(matrix1, "matrix1");
    const _matrix2 = toNumberMatrix(matrix2, "matrix2");

    if (_matrix1.length === 0 || _matrix2.length === 0) {
      return new EvaluationError(
        _t("The first and second arguments of [[FUNCTION_NAME]] must be non-empty matrices.")
      );
    }

    if (_matrix1.length !== _matrix2[0].length) {
      return new EvaluationError(
        _t(
          "In [[FUNCTION_NAME]], the number of columns of the first matrix (%s) must be equal to the \
          number of rows of the second matrix (%s).",
          _matrix1.length.toString(),
          _matrix2[0].length.toString()
        )
      );
    }

    return toSubMatrix(
      zone,
      matrixMap(multiplyMatrices(_matrix1, _matrix2), (value) => ({ value }))
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUMPRODUCT
// -----------------------------------------------------------------------------
export const SUMPRODUCT = {
  description: _t(
    "Calculates the sum of the products of corresponding entries in equal-sized ranges."
  ),
  args: [
    arg(
      "range (number, range<number>, repeating)",
      _t(
        "The range whose entries will be multiplied with corresponding entries in the other range."
      )
    ),
  ],
  compute: function (...args: Arg[]) {
    if (!areSameDimensions(...args)) {
      return new EvaluationError(_t("All the ranges must have the same dimensions."));
    }
    const _args = args.map(toMatrix);
    let result = 0;
    for (let col = 0; col < _args[0].length; col++) {
      for (let row = 0; row < _args[0][col].length; row++) {
        if (!_args.every((range) => typeof range[col][row].value === "number")) {
          continue;
        }
        let product = 1;
        for (const range of _args) {
          product *= toNumber(range[col][row], this.locale);
        }
        result += product;
      }
    }
    return { value: result };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUMX2MY2
// -----------------------------------------------------------------------------

/**
 * Return the sum of the callback applied to each pair of values in the two arrays.
 *
 * Ignore the pairs X,Y where one of the value isn't a number. Throw an error if no pair of numbers is found.
 */
function getSumXAndY(arrayX: Arg, arrayY: Arg, cb: (x: number, y: number) => number) {
  if (!areSameDimensions(arrayX, arrayY)) {
    return new EvaluationError(
      _t("The arguments array_x and array_y must have the same dimensions.")
    );
  }
  const _arrayX = toMatrix(arrayX);
  const _arrayY = toMatrix(arrayY);

  let validPairFound = false;
  let result = 0;
  for (const col in _arrayX) {
    for (const row in _arrayX[col]) {
      const arrayXValue = _arrayX[col][row].value;
      const arrayYValue = _arrayY[col][row].value;
      if (typeof arrayXValue !== "number" || typeof arrayYValue !== "number") {
        continue;
      }
      validPairFound = true;
      result += cb(arrayXValue, arrayYValue);
    }
  }

  if (!validPairFound) {
    return new EvaluationError(
      _t("The arguments array_x and array_y must contain at least one pair of numbers.")
    );
  }

  return result;
}

export const SUMX2MY2 = {
  description: _t(
    "Calculates the sum of the difference of the squares of the values in two array."
  ),
  args: [
    arg(
      "array_x (number, range<number>)",
      _t(
        "The array or range of values whose squares will be reduced by the squares of corresponding entries in array_y and added together."
      )
    ),
    arg(
      "array_y (number, range<number>)",
      _t(
        "The array or range of values whose squares will be subtracted from the squares of corresponding entries in array_x and added together."
      )
    ),
  ],
  compute: function (arrayX: Arg, arrayY: Arg) {
    const result = getSumXAndY(arrayX, arrayY, (x, y) => x ** 2 - y ** 2);
    if (result instanceof EvaluationError) {
      return result;
    }
    return { value: result };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUMX2PY2
// -----------------------------------------------------------------------------
export const SUMX2PY2 = {
  description: _t("Calculates the sum of the sum of the squares of the values in two array."),
  args: [
    arg(
      "array_x (number, range<number>)",
      _t(
        "The array or range of values whose squares will be added to the squares of corresponding entries in array_y and added together."
      )
    ),
    arg(
      "array_y (number, range<number>)",
      _t(
        "The array or range of values whose squares will be added to the squares of corresponding entries in array_x and added together."
      )
    ),
  ],
  compute: function (arrayX: Arg, arrayY: Arg) {
    const result = getSumXAndY(arrayX, arrayY, (x, y) => x ** 2 + y ** 2);
    if (result instanceof EvaluationError) {
      return result;
    }
    return { value: result };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUMXMY2
// -----------------------------------------------------------------------------
export const SUMXMY2 = {
  description: _t("Calculates the sum of squares of the differences of values in two array."),
  args: [
    arg(
      "array_x (number, range<number>)",
      _t(
        "The array or range of values that will be reduced by corresponding entries in array_y, squared, and added together."
      )
    ),
    arg(
      "array_y (number, range<number>)",
      _t(
        "The array or range of values that will be subtracted from corresponding entries in array_x, the result squared, and all such results added together."
      )
    ),
  ],
  compute: function (arrayX: Arg, arrayY: Arg) {
    const result = getSumXAndY(arrayX, arrayY, (x, y) => (x - y) ** 2);
    if (result instanceof EvaluationError) {
      return result;
    }
    return { value: result };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TOCOL
// -----------------------------------------------------------------------------
const TO_COL_ROW_DEFAULT_IGNORE = 0;
const TO_COL_ROW_DEFAULT_SCAN = false;
const TO_COL_ROW_ARGS = [
  arg("array (any, range<any>)", _t("The array which will be transformed.")),
  arg(
    `ignore (number, default=${TO_COL_ROW_DEFAULT_IGNORE})`,
    _t("Whether to ignore certain types of values. By default, no values are ignored."),
    [
      { value: 0, label: _t("Keep all values (default)") },
      { value: 1, label: _t("Ignore blanks") },
      { value: 2, label: _t("Ignore errors") },
      { value: 3, label: _t("Ignore blanks and errors") },
    ]
  ),
  arg(
    `scan_by_column (number, default=${TO_COL_ROW_DEFAULT_SCAN})`,
    _t("Scan the array by column. By default, the array is scanned by row."),
    [
      { value: false, label: _t("Scan by row (default)") },
      { value: true, label: _t("Scan by column") },
    ]
  ),
];

function shouldKeepValue(ignore: number): (data: FunctionResultObject) => boolean {
  const _ignore = Math.trunc(ignore);
  if (_ignore === 0) {
    return () => true;
  }
  if (_ignore === 1) {
    return (data) => data.value !== null;
  }
  if (_ignore === 2) {
    return (data) => !isEvaluationError(data.value);
  }
  if (_ignore === 3) {
    return (data) => data.value !== null && !isEvaluationError(data.value);
  }
  throw new EvaluationError(_t("Argument ignore must be between 0 and 3"));
}

export const TOCOL = {
  description: _t("Transforms a range of cells into a single column."),
  args: TO_COL_ROW_ARGS,
  computeArray: function (
    zone: UnboundedZone,
    array: Arg,
    ignore: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _array = toMatrix(array);
    const _ignore = toNumber(ignore.value, this.locale);
    const _scanByColumn = toBoolean(scanByColumn.value);

    const result = (_scanByColumn ? _array : transposeMatrix(_array))
      .flat()
      .filter(shouldKeepValue(_ignore));
    if (result.length === 0) {
      return new NotAvailableError(_t("No results for the given arguments of TOCOL."));
    }
    return toSubMatrix(zone, [result]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TOROW
// -----------------------------------------------------------------------------
export const TOROW = {
  description: _t("Transforms a range of cells into a single row."),
  args: TO_COL_ROW_ARGS,
  computeArray: function (
    zone: UnboundedZone,
    array: Arg,
    ignore: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _array = toMatrix(array);
    const _ignore = toNumber(ignore.value, this.locale);
    const _scanByColumn = toBoolean(scanByColumn.value);
    const result = (_scanByColumn ? _array : transposeMatrix(_array))
      .flat()
      .filter(shouldKeepValue(_ignore))
      .map((item) => [item]);

    if (result.length === 0 || result[0].length === 0) {
      return new NotAvailableError(_t("No results for the given arguments of TOROW."));
    }
    return toSubMatrix(zone, result);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TRANSPOSE
// -----------------------------------------------------------------------------
export const TRANSPOSE = {
  description: _t("Transposes the rows and columns of a range."),
  args: [arg("range (any, range<any>)", _t("The range to be transposed."))],
  computeArray: function (zone: UnboundedZone, arg: Arg) {
    const _array = toMatrix(arg);
    const nbColumns = _array[0].length;
    const nbRows = _array.length;

    return generateSubMatrix(zone, nbColumns, nbRows, (col, row) => _array[row][col]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VSTACK
// -----------------------------------------------------------------------------
export const VSTACK = {
  description: _t("Appends ranges vertically and in sequence to return a larger array."),
  args: [arg("range (any, range<any>, repeating)", _t("The range to be appended."))],
  computeArray: function (zone: UnboundedZone, ...ranges: Arg[]) {
    return toSubMatrix(zone, stackVertically(ranges));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// WRAPCOLS
// -----------------------------------------------------------------------------
export const WRAPCOLS = {
  description: _t(
    "Wraps the provided row or column of cells by columns after a specified number of elements to form a new array."
  ),
  args: [
    arg("range (any, range<any>)", _t("The range to wrap.")),
    arg(
      "wrap_count (number)",
      _t("The maximum number of cells for each column, rounded down to the nearest whole number.")
    ),
    arg(
      "pad_with  (any, default=0)", // TODO : replace with #N/A
      _t("The value with which to fill the extra cells in the range.")
    ),
  ],
  computeArray: function (
    zone: UnboundedZone,
    range: Arg,
    wrapCount: Maybe<FunctionResultObject>,
    padWith: Maybe<FunctionResultObject> = { value: 0 }
  ) {
    const _array = toMatrix(range);
    const nbRows = toInteger(wrapCount?.value, this.locale);

    if (!isSingleColOrRow(_array)) {
      return new EvaluationError(_t("Argument range must be a single row or column."));
    }

    const array = _array.flat();
    const nbColumns = Math.ceil(array.length / nbRows);

    return generateSubMatrix(zone, nbColumns, nbRows, (col, row) => {
      const index = col * nbRows + row;
      return index < array.length ? array[index] : padWith;
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// WRAPROWS
// -----------------------------------------------------------------------------
export const WRAPROWS = {
  description: _t(
    "Wraps the provided row or column of cells by rows after a specified number of elements to form a new array."
  ),
  args: [
    arg("range (any, range<any>)", _t("The range to wrap.")),
    arg(
      "wrap_count (number)",
      _t("The maximum number of cells for each row, rounded down to the nearest whole number.")
    ),
    arg(
      "pad_with  (any, default=0)", // TODO : replace with #N/A
      _t("The value with which to fill the extra cells in the range.")
    ),
  ],
  computeArray: function (
    zone: UnboundedZone,
    range: Arg,
    wrapCount: Maybe<FunctionResultObject>,
    padWith: Maybe<FunctionResultObject> = { value: 0 }
  ) {
    const _array = toMatrix(range);
    const nbColumns = toInteger(wrapCount?.value, this.locale);

    if (!isSingleColOrRow(_array)) {
      return new EvaluationError(_t("Argument range must be a single row or column."));
    }

    const array = _array.flat();
    const nbRows = Math.ceil(array.length / nbColumns);

    return generateSubMatrix(zone, nbColumns, nbRows, (col, row) => {
      const index = row * nbColumns + col;
      return index < array.length ? array[index] : padWith;
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ARRAYTOTEXT
// -----------------------------------------------------------------------------

const FORMAT_OPTIONS = [
  { value: 0, label: _t("Concise format (default)") },
  { value: 1, label: _t("Strict format") },
];

export const ARRAYTOTEXT = {
  description: _t(
    "returns an array of text values from any specified range. It passes text values unchanged, and converts non-text values to text."
  ),
  args: [
    arg("array (range)", _t("The array to convert into text")),
    arg("format (number, default=0)", _t("The format of the returned data."), FORMAT_OPTIONS),
  ],
  compute: function (
    array: Matrix<{ value: string }>,
    format: Maybe<FunctionResultObject> = { value: 0 }
  ) {
    const _format = toNumber(format, this.locale);
    const _array = toMatrix(array);
    if (_format === 1) {
      return { value: evaluationResultToDisplayString(_array, "", this.locale) };
    } else if (_format === 0) {
      const rowSeparator = this.locale.decimalSeparator === "," ? "/" : ",";
      const arrayStr = transposeMatrix(_array)
        .flatMap((row) =>
          row.map((value) => {
            return isEvaluationError(value.value) ? value.value : toString(value);
          })
        )
        .join(rowSeparator);
      return { value: arrayStr };
    } else {
      return new EvaluationError(_t("Format must be 0 or 1"));
    }
  },
  isExported: true,
} satisfies AddFunctionDescription;
