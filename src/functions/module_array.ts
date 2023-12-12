import { _t } from "../translation";
import { AddFunctionDescription, Arg, FPayload, Matrix, Maybe } from "../types";
import { EvaluationError, NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import {
  assertPositive,
  assertSameDimensions,
  assertSingleColOrRow,
  assertSquareMatrix,
} from "./helper_assert";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";
import {
  assert,
  flattenRowFirst,
  generateMatrix,
  isEvaluationError,
  toBoolean,
  toInteger,
  toMatrix,
  toNumber,
  toNumberMatrix,
  transposeMatrix,
} from "./helpers";

// -----------------------------------------------------------------------------
// ARRAY_CONSTRAIN
// -----------------------------------------------------------------------------
export const ARRAY_CONSTRAIN = {
  description: _t("Returns a result array constrained to a specific width and height."),
  args: [
    arg("input_range (any, range<any>)", _t("The range to constrain.")),
    arg("rows (number)", _t("The number of rows in the constrained array.")),
    arg("columns (number)", _t("The number of columns in the constrained array.")),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (
    array: Arg,
    rows: Maybe<FPayload>,
    columns: Maybe<FPayload>
  ): Matrix<FPayload> {
    const _array = toMatrix(array);
    const _rowsArg = toInteger(rows?.value, this.locale);
    const _columnsArg = toInteger(columns?.value, this.locale);

    assertPositive(
      _t("The rows argument (%s) must be strictly positive.", _rowsArg.toString()),
      _rowsArg
    );
    assertPositive(
      _t("The columns argument (%s) must be strictly positive.", _rowsArg.toString()),
      _columnsArg
    );

    const _nbRows = Math.min(_rowsArg, _array[0].length);
    const _nbColumns = Math.min(_columnsArg, _array.length);

    return generateMatrix(_nbColumns, _nbRows, (col, row) => _array[col][row]);
  },
  isExported: false,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CHOOSECOLS
// -----------------------------------------------------------------------------
export const CHOOSECOLS = {
  description: _t("Creates a new array from the selected columns in the existing range."),
  args: [
    arg("array (any, range<any>)", _t("The array that contains the columns to be returned.")),
    arg(
      "col_num (number, range<number>)",
      _t("The first column index of the columns to be returned.")
    ),
    arg(
      "col_num2 (number, range<number>, repeating)",
      _t("The columns indexes of the columns to be returned.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (array: Arg, ...columns: Arg[]): Matrix<FPayload> {
    const _array = toMatrix(array);
    const _columns = flattenRowFirst(columns, (item) => toInteger(item?.value, this.locale));

    assert(
      () => _columns.every((col) => col > 0 && col <= _array.length),
      _t(
        "The columns arguments must be between 1 and %s (got %s).",
        _array.length.toString(),
        (_columns.find((col) => col <= 0 || col > _array.length) || 0).toString()
      )
    );

    const result: Matrix<FPayload> = Array(_columns.length);
    for (let col = 0; col < _columns.length; col++) {
      const colIndex = _columns[col] - 1; // -1 because columns arguments are 1-indexed
      result[col] = _array[colIndex];
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
    arg("row_num (number, range<number>)", _t("The first row index of the rows to be returned.")),
    arg(
      "row_num2 (number, range<number>, repeating)",
      _t("The rows indexes of the rows to be returned.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (array: Arg, ...rows: Arg[]): Matrix<FPayload> {
    const _array = toMatrix(array);
    const _rows = flattenRowFirst(rows, (item) => toInteger(item?.value, this.locale));
    const _nbColumns = _array.length;

    assert(
      () => _rows.every((row) => row > 0 && row <= _array[0].length),
      _t(
        "The rows arguments must be between 1 and %s (got %s).",
        _array[0].length.toString(),
        (_rows.find((row) => row <= 0 || row > _array[0].length) || 0).toString()
      )
    );

    return generateMatrix(_nbColumns, _rows.length, (col, row) => _array[col][_rows[row] - 1]); // -1 because rows arguments are 1-indexed
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EXPAND
// -----------------------------------------------------------------------------
export const EXPAND = {
  description: _t("Expands or pads an array to specified row and column dimensions."),
  args: [
    arg("array (any, range<any>)", _t("The array to expand.")),
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
  returns: ["RANGE<ANY>"],
  compute: function (
    arg: Arg,
    rows: Maybe<FPayload>,
    columns?: Maybe<FPayload>,
    padWith: Maybe<FPayload> = { value: 0 } // TODO : Replace with #N/A errors once it's supported
  ): Matrix<FPayload> {
    const _array = toMatrix(arg);
    const _nbRows = toInteger(rows?.value, this.locale);
    const _nbColumns =
      columns !== undefined ? toInteger(columns.value, this.locale) : _array.length;

    assert(
      () => _nbRows >= _array[0].length,
      _t(
        "The rows arguments (%s) must be greater or equal than the number of rows of the array.",
        _nbRows.toString()
      )
    );
    assert(
      () => _nbColumns >= _array.length,
      _t(
        "The columns arguments (%s) must be greater or equal than the number of columns of the array.",
        _nbColumns.toString()
      )
    );

    return generateMatrix(_nbColumns, _nbRows, (col, row) =>
      col >= _array.length || row >= _array[col].length ? padWith : _array[col][row]
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLATTEN
// -----------------------------------------------------------------------------
export const FLATTEN = {
  description: _t("Flattens all the values from one or more ranges into a single column."),
  args: [
    arg("range (any, range<any>)", _t("The first range to flatten.")),
    arg("range2 (any, range<any>, repeating)", _t("Additional ranges to flatten.")),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (...ranges: Arg[]): Matrix<FPayload> {
    return [flattenRowFirst(ranges, (val) => (val === undefined ? { value: "" } : val))];
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
  returns: ["RANGE<NUMBER>"],
  compute: function (data: Matrix<FPayload>, classes: Matrix<FPayload>): Matrix<number> {
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
      .map((val) => val.count);
    return [result];
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// HSTACK
// -----------------------------------------------------------------------------
export const HSTACK = {
  description: _t("Appends ranges horizontally and in sequence to return a larger array."),
  args: [
    arg("range1 (any, range<any>)", _t("The first range to be appended.")),
    arg("range2 (any, range<any>, repeating)", _t("Additional ranges to add to range1.")),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (...ranges: Arg[]): Matrix<FPayload> {
    const nbRows = Math.max(...ranges.map((r) => r?.[0]?.length ?? 0));

    const result: Matrix<FPayload> = [];

    for (const range of ranges) {
      const _range = toMatrix(range);
      for (let col = 0; col < _range.length; col++) {
        //TODO: fill with #N/A for unavailable values instead of zeroes
        const array: FPayload[] = Array(nbRows).fill({ value: null });
        for (let row = 0; row < _range[col].length; row++) {
          array[row] = _range[col][row];
        }
        result.push(array);
      }
    }
    return result;
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
  returns: ["NUMBER"],
  compute: function (matrix: Arg): number {
    const _matrix = toNumberMatrix(matrix, "square_matrix");
    assertSquareMatrix(
      _t("The argument square_matrix must have the same number of columns and rows."),
      _matrix
    );
    return invertMatrix(_matrix).determinant;
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
  returns: ["RANGE<NUMBER>"],
  compute: function (matrix: Arg): Matrix<number> {
    const _matrix = toNumberMatrix(matrix, "square_matrix");
    assertSquareMatrix(
      _t("The argument square_matrix must have the same number of columns and rows."),
      _matrix
    );
    const { inverted } = invertMatrix(_matrix);
    if (!inverted) {
      throw new EvaluationError(_t("The matrix is not invertible."));
    }
    return inverted;
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
  returns: ["RANGE<NUMBER>"],
  compute: function (matrix1: Arg, matrix2: Arg): Matrix<number> {
    const _matrix1 = toNumberMatrix(matrix1, "matrix1");
    const _matrix2 = toNumberMatrix(matrix2, "matrix2");

    assert(
      () => _matrix1.length === _matrix2[0].length,
      _t(
        "In [[FUNCTION_NAME]], the number of columns of the first matrix (%s) must be equal to the \
        number of rows of the second matrix (%s).",
        _matrix1.length.toString(),
        _matrix2[0].length.toString()
      )
    );

    return multiplyMatrices(_matrix1, _matrix2);
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
      "range1 (number, range<number>)",
      _t(
        "The first range whose entries will be multiplied with corresponding entries in the other ranges."
      )
    ),
    arg(
      "range2 (number, range<number>, repeating)",
      _t(
        "The other range whose entries will be multiplied with corresponding entries in the other ranges."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...args: Arg[]): number {
    assertSameDimensions(_t("All the ranges must have the same dimensions."), ...args);
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
    return result;
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
function getSumXAndY(arrayX: Arg, arrayY: Arg, cb: (x: number, y: number) => number): number {
  assertSameDimensions(
    "The arguments array_x and array_y must have the same dimensions.",
    arrayX,
    arrayY
  );
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
    throw new EvaluationError(
      "The arguments array_x and array_y must contain at least one pair of numbers."
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
  returns: ["NUMBER"],
  compute: function (arrayX: Arg, arrayY: Arg): number {
    return getSumXAndY(arrayX, arrayY, (x, y) => x ** 2 - y ** 2);
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
  returns: ["NUMBER"],
  compute: function (arrayX: Arg, arrayY: Arg): number {
    return getSumXAndY(arrayX, arrayY, (x, y) => x ** 2 + y ** 2);
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
  returns: ["NUMBER"],
  compute: function (arrayX: Arg, arrayY: Arg): number {
    return getSumXAndY(arrayX, arrayY, (x, y) => (x - y) ** 2);
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
    _t(
      "The control to ignore blanks and errors. 0 (default) is to keep all values, 1 is to ignore blanks, 2 is to ignore errors, and 3 is to ignore blanks and errors."
    )
  ),
  arg(
    `scan_by_column (number, default=${TO_COL_ROW_DEFAULT_SCAN})`,
    _t(
      "Whether the array should be scanned by column. True scans the array by column and false (default) \
      scans the array by row."
    )
  ),
];

function shouldKeepValue(ignore: number): (data: FPayload) => boolean {
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
  returns: ["RANGE<ANY>"],
  compute: function (
    array: Arg,
    ignore: Maybe<FPayload> = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: Maybe<FPayload> = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _array = toMatrix(array);
    const _ignore = toNumber(ignore.value, this.locale);
    const _scanByColumn = toBoolean(scanByColumn.value);

    const result = (_scanByColumn ? _array : transposeMatrix(_array))
      .flat()
      .filter(shouldKeepValue(_ignore));
    if (result.length === 0) {
      throw new NotAvailableError(_t("No results for the given arguments of TOCOL."));
    }
    return [result];
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TOROW
// -----------------------------------------------------------------------------
export const TOROW = {
  description: _t("Transforms a range of cells into a single row."),
  args: TO_COL_ROW_ARGS,
  returns: ["RANGE<ANY>"],
  compute: function (
    array: Arg,
    ignore: Maybe<FPayload> = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: Maybe<FPayload> = { value: TO_COL_ROW_DEFAULT_SCAN }
  ): Matrix<FPayload> {
    const _array = toMatrix(array);
    const _ignore = toNumber(ignore.value, this.locale);
    const _scanByColumn = toBoolean(scanByColumn.value);
    const result = (_scanByColumn ? _array : transposeMatrix(_array))
      .flat()
      .filter(shouldKeepValue(_ignore))
      .map((item) => [item]);

    if (result.length === 0 || result[0].length === 0) {
      throw new NotAvailableError(_t("No results for the given arguments of TOROW."));
    }
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TRANSPOSE
// -----------------------------------------------------------------------------
export const TRANSPOSE = {
  description: _t("Transposes the rows and columns of a range."),
  args: [arg("range (any, range<any>)", _t("The range to be transposed."))],
  returns: ["RANGE"],
  compute: function (arg: Arg): Matrix<FPayload> {
    const _array = toMatrix(arg);
    const nbColumns = _array[0].length;
    const nbRows = _array.length;

    return generateMatrix(nbColumns, nbRows, (col, row) => _array[row][col]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VSTACK
// -----------------------------------------------------------------------------
export const VSTACK = {
  description: _t("Appends ranges vertically and in sequence to return a larger array."),
  args: [
    arg("range1 (any, range<any>)", _t("The first range to be appended.")),
    arg("range2 (any, range<any>, repeating)", _t("Additional ranges to add to range1.")),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (...ranges: Arg[]): Matrix<FPayload> {
    const nbColumns = Math.max(...ranges.map((range) => toMatrix(range).length));
    const nbRows = ranges.reduce((acc, range) => acc + toMatrix(range)[0].length, 0);

    const result: Matrix<FPayload> = Array(nbColumns)
      .fill([])
      .map(() => Array(nbRows).fill({ value: 0 })); // TODO fill with #N/A

    let currentRow = 0;
    for (const range of ranges) {
      const _array = toMatrix(range);
      for (let col = 0; col < _array.length; col++) {
        for (let row = 0; row < _array[col].length; row++) {
          result[col][currentRow + row] = _array[col][row];
        }
      }
      currentRow += _array[0].length;
    }

    return result;
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
  returns: ["RANGE<ANY>"],
  compute: function (
    range: Arg,
    wrapCount: Maybe<FPayload>,
    padWith: Maybe<FPayload> = { value: 0 }
  ): Matrix<FPayload> {
    const _array = toMatrix(range);
    const nbRows = toInteger(wrapCount?.value, this.locale);

    assertSingleColOrRow(_t("Argument range must be a single row or column."), _array);

    const array = _array.flat();
    const nbColumns = Math.ceil(array.length / nbRows);

    return generateMatrix(nbColumns, nbRows, (col, row) => {
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
  returns: ["RANGE<ANY>"],
  compute: function (
    range: Arg,
    wrapCount: Maybe<FPayload>,
    padWith: Maybe<FPayload> = { value: 0 }
  ): Matrix<FPayload> {
    const _array = toMatrix(range);
    const nbColumns = toInteger(wrapCount?.value, this.locale);

    assertSingleColOrRow(_t("Argument range must be a single row or column."), _array);

    const array = _array.flat();
    const nbRows = Math.ceil(array.length / nbColumns);

    return generateMatrix(nbColumns, nbRows, (col, row) => {
      const index = row * nbColumns + col;
      return index < array.length ? array[index] : padWith;
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;
