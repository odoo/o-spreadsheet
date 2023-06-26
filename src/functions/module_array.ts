import { _lt } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  CellValue,
  isMatrix,
  Matrix,
  MatrixArgValue,
  PrimitiveArgValue,
} from "../types";
import { NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import {
  assert,
  flattenRowFirst,
  reduceAny,
  toBoolean,
  toCellValue,
  toCellValueMatrix,
  toInteger,
  toMatrixArgValue,
  toNumber,
} from "./helpers";
import {
  assertPositive,
  assertSameDimensions,
  assertSingleColOrRow,
  assertSquareMatrix,
  isNumberMatrix,
} from "./helper_assert";
import { mapBothValueAndFormat } from "./helper_math";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";

// -----------------------------------------------------------------------------
// ARRAY_CONSTRAIN
// -----------------------------------------------------------------------------
export const ARRAY_CONSTRAIN: AddFunctionDescription = {
  description: _lt("Returns a result array constrained to a specific width and height."),
  args: [
    arg("input_range (any, range<any>)", _lt("The range to constrain.")),
    arg("rows (number)", _lt("The number of rows in the constrained array.")),
    arg("columns (number)", _lt("The number of columns in the constrained array.")),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (
    array: ArgValue,
    rows: PrimitiveArgValue,
    columns: PrimitiveArgValue
  ): Matrix<CellValue> {
    const _array = toMatrixArgValue(array);
    const _rowsArg = toInteger(rows);
    const _columnsArg = toInteger(columns);

    assertPositive(
      _lt("The rows argument (%s) must be strictly positive.", _rowsArg.toString()),
      _rowsArg
    );
    assertPositive(
      _lt("The columns argument (%s) must be strictly positive.", _rowsArg.toString()),
      _columnsArg
    );

    const _rows = Math.min(_rowsArg, _array[0].length);
    const _columns = Math.min(_columnsArg, _array.length);

    const result: Matrix<CellValue> = Array(_columns);
    for (let col = 0; col < _columns; col++) {
      result[col] = Array(_rows);
      for (let row = 0; row < _rows; row++) {
        result[col][row] = toCellValue(_array[col][row]);
      }
    }
    return result;
  },
  isExported: false,
};

// -----------------------------------------------------------------------------
// CHOOSECOLS
// -----------------------------------------------------------------------------
export const CHOOSECOLS: AddFunctionDescription = {
  description: _lt("Creates a new array from the selected columns in the existing range."),
  args: [
    arg("array (any, range<any>)", _lt("The array that contains the columns to be returned.")),
    arg(
      "col_num (number, range<number>)",
      _lt("The first column index of the columns to be returned.")
    ),
    arg(
      "col_num2 (number, range<number>, repeating)",
      _lt("The columns indexes of the columns to be returned.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (array: ArgValue, ...columns: ArgValue[]): Matrix<CellValue> {
    const _array = toMatrixArgValue(array);
    const _columns = flattenRowFirst(columns, toInteger);
    assert(
      () => _columns.every((col) => col > 0 && col <= _array.length),
      _lt(
        "The columns arguments must be between 1 and %s (got %s).",
        _array.length.toString(),
        (_columns.find((col) => col <= 0 || col > _array.length) || 0).toString()
      )
    );

    const result: MatrixArgValue = Array(_columns.length);
    for (let i = 0; i < _columns.length; i++) {
      const colIndex = _columns[i] - 1; // -1 because columns arguments are 1-indexed
      result[i] = _array[colIndex];
    }

    return toCellValueMatrix(result);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CHOOSEROWS
// -----------------------------------------------------------------------------
export const CHOOSEROWS: AddFunctionDescription = {
  description: _lt("Creates a new array from the selected rows in the existing range."),
  args: [
    arg("array (any, range<any>)", _lt("The array that contains the rows to be returned.")),
    arg("row_num (number, range<number>)", _lt("The first row index of the rows to be returned.")),
    arg(
      "row_num2 (number, range<number>, repeating)",
      _lt("The rows indexes of the rows to be returned.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (array: ArgValue, ...rows: ArgValue[]): Matrix<CellValue> {
    const _array = toMatrixArgValue(array);
    const _rows = flattenRowFirst(rows, toInteger);
    assert(
      () => _rows.every((row) => row > 0 && row <= _array[0].length),
      _lt(
        "The rows arguments must be between 1 and %s (got %s).",
        _array[0].length.toString(),
        (_rows.find((row) => row <= 0 || row > _array[0].length) || 0).toString()
      )
    );

    const result: Matrix<CellValue> = Array(_array.length);
    for (let col = 0; col < _array.length; col++) {
      result[col] = Array(_rows.length);
      for (let row = 0; row < _rows.length; row++) {
        const rowIndex = _rows[row] - 1; // -1 because rows arguments are 1-indexed
        result[col][row] = toCellValue(_array[col][rowIndex]);
      }
    }

    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// EXPAND
// -----------------------------------------------------------------------------
export const EXPAND: AddFunctionDescription = {
  description: _lt("Expands or pads an array to specified row and column dimensions."),
  args: [
    arg("array (any, range<any>)", _lt("The array to expand.")),
    arg(
      "rows (number)",
      _lt("The number of rows in the expanded array. If missing, rows will not be expanded.")
    ),
    arg(
      "columns (number, optional)",
      _lt("The number of columns in the expanded array. If missing, columns will not be expanded.")
    ),
    arg("pad_with (any, default=0)", _lt("The value with which to pad.")), // @compatibility: on Excel, pad with #N/A
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (
    array: ArgValue,
    rows: PrimitiveArgValue,
    columns?: PrimitiveArgValue,
    padWith: PrimitiveArgValue = 0
  ): Matrix<CellValue> {
    const _array = toMatrixArgValue(array);
    const _rows = toInteger(rows);
    const _columns = columns !== undefined ? toInteger(columns) : _array.length;
    const _padWith = padWith !== undefined && padWith !== null ? padWith : 0; // TODO : Replace with #N/A errors once it's supported

    assert(
      () => _rows >= _array[0].length,
      _lt(
        "The rows arguments (%s) must be greater or equal than the number of rows of the array.",
        _rows.toString()
      )
    );
    assert(
      () => _columns >= _array.length,
      _lt(
        "The columns arguments (%s) must be greater or equal than the number of columns of the array.",
        _columns.toString()
      )
    );

    const result: Matrix<CellValue> = [];
    for (let col = 0; col < _columns; col++) {
      result[col] = [];
      for (let row = 0; row < _rows; row++) {
        if (col >= _array.length || row >= _array[col].length) {
          result[col][row] = _padWith;
        } else {
          result[col][row] = _array[col][row] ?? 0;
        }
      }
    }
    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FLATTEN
// -----------------------------------------------------------------------------
export const FLATTEN: AddFunctionDescription = {
  description: _lt("Flattens all the values from one or more ranges into a single column."),
  args: [
    arg("range (any, range<any>)", _lt("The first range to flatten.")),
    arg("range2 (any, range<any>, repeating)", _lt("Additional ranges to flatten.")),
  ],
  returns: ["RANGE<ANY>"],
  compute: function (...ranges: ArgValue[]): Matrix<CellValue> {
    return [flattenRowFirst(ranges, toCellValue)];
  },
  isExported: false,
};

// -----------------------------------------------------------------------------
// FREQUENCY
// -----------------------------------------------------------------------------
export const FREQUENCY: AddFunctionDescription = {
  description: _lt("Calculates the frequency distribution of a range."),
  args: [
    arg("data (range<number>)", _lt("The array of ranges containing the values to be counted.")),
    arg("classes (number, range<number>)", _lt("The range containing the set of classes.")),
  ],
  returns: ["RANGE<NUMBER>"],
  compute: function (data: MatrixArgValue, classes: MatrixArgValue): CellValue[][] {
    const _data = flattenRowFirst([data], (val) => val).filter(
      (val): val is number => typeof val === "number"
    );
    const _classes = flattenRowFirst([classes], (val) => val).filter(
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
};

// -----------------------------------------------------------------------------
// HSTACK
// -----------------------------------------------------------------------------
export const HSTACK: AddFunctionDescription = {
  description: _lt("Appends ranges horizontally and in sequence to return a larger array."),
  args: [
    arg("range1 (any, range<any>)", _lt("The first range to be appended.")),
    arg("range2 (any, range<any>, repeating)", _lt("Additional ranges to add to range1.")),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (...ranges: ArgValue[]): Matrix<CellValue> {
    const _ranges = ranges.map((range) => toMatrixArgValue(range));

    const nRows = Math.max(..._ranges.map((range) => range[0].length));

    const colArray: Matrix<CellValue> = [];
    for (const range of _ranges) {
      for (const col of range) {
        //TODO: fill with #N/A for unavailable values instead of zeroes
        const paddedCol: CellValue[] = Array(nRows).fill(0);
        for (let i = 0; i < col.length; i++) {
          paddedCol[i] = toCellValue(col[i]);
        }
        colArray.push(paddedCol);
      }
    }
    return colArray;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MDETERM
// -----------------------------------------------------------------------------
export const MDETERM: AddFunctionDescription = {
  description: _lt("Returns the matrix determinant of a square matrix."),
  args: [
    arg(
      "square_matrix (number, range<number>)",
      _lt(
        "An range with an equal number of rows and columns representing a matrix whose determinant will be calculated."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (matrix: ArgValue): number {
    const _matrix = toMatrixArgValue(matrix);

    assertSquareMatrix(
      _lt("The argument square_matrix must have the same number of columns and rows."),
      _matrix
    );
    if (!isNumberMatrix(_matrix)) {
      throw new Error(_lt("The argument square_matrix must be a matrix of numbers."));
    }
    const { determinant } = invertMatrix(_matrix);

    return determinant;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MINVERSE
// -----------------------------------------------------------------------------
export const MINVERSE: AddFunctionDescription = {
  description: _lt("Returns the multiplicative inverse of a square matrix."),
  args: [
    arg(
      "square_matrix (number, range<number>)",
      _lt(
        "An range with an equal number of rows and columns representing a matrix whose multiplicative inverse will be calculated."
      )
    ),
  ],
  returns: ["RANGE<NUMBER>"],
  compute: function (matrix: ArgValue): Matrix<CellValue> {
    const _matrix = toMatrixArgValue(matrix);

    assertSquareMatrix(
      _lt("The argument square_matrix must have the same number of columns and rows."),
      _matrix
    );
    if (!isNumberMatrix(_matrix)) {
      throw new Error(_lt("The argument square_matrix must be a matrix of numbers."));
    }

    const { inverted } = invertMatrix(_matrix);
    if (!inverted) {
      throw new Error(_lt("The matrix is not invertible."));
    }

    return inverted;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MMULT
// -----------------------------------------------------------------------------
export const MMULT: AddFunctionDescription = {
  description: _lt("Calculates the matrix product of two matrices."),
  args: [
    arg(
      "matrix1 (number, range<number>)",
      _lt("The first matrix in the matrix multiplication operation.")
    ),
    arg(
      "matrix2 (number, range<number>)",
      _lt("The second matrix in the matrix multiplication operation.")
    ),
  ],
  returns: ["RANGE<NUMBER>"],
  compute: function (matrix1: ArgValue, matrix2: ArgValue): Matrix<CellValue> {
    const _matrix1 = toMatrixArgValue(matrix1);
    const _matrix2 = toMatrixArgValue(matrix2);

    assert(
      () => _matrix1.length === _matrix2[0].length,
      _lt(
        "In [[FUNCTION_NAME]], the number of columns of the first matrix (%s) must be equal to the \
        number of rows of the second matrix (%s).",
        _matrix1.length.toString(),
        _matrix2[0].length.toString()
      )
    );
    if (!isNumberMatrix(_matrix1) || !isNumberMatrix(_matrix2)) {
      throw new Error(_lt("The arguments matrix1 and matrix2 must be matrices of numbers."));
    }

    return multiplyMatrices(_matrix1, _matrix2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUMPRODUCT
// -----------------------------------------------------------------------------
export const SUMPRODUCT: AddFunctionDescription = {
  description: _lt(
    "Calculates the sum of the products of corresponding entries in equal-sized ranges."
  ),
  args: [
    arg(
      "range1 (number, range<number>)",
      _lt(
        "The first range whose entries will be multiplied with corresponding entries in the other ranges."
      )
    ),
    arg(
      "range2 (number, range<number>, repeating)",
      _lt(
        "The other range whose entries will be multiplied with corresponding entries in the other ranges."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...args: ArgValue[]): number {
    assertSameDimensions(_lt("All the ranges must have the same dimensions."), ...args);
    const _args = args.map(toMatrixArgValue);
    let result = 0;
    for (let i = 0; i < _args[0].length; i++) {
      for (let j = 0; j < _args[0][i].length; j++) {
        if (!_args.every((range) => typeof range[i][j] === "number")) {
          continue;
        }
        let product = 1;
        for (const range of _args) {
          product *= toNumber(range[i][j]);
        }
        result += product;
      }
    }
    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUMX2MY2
// -----------------------------------------------------------------------------

/**
 * Return the sum of the callback applied to each pair of values in the two arrays.
 *
 * Ignore the pairs X,Y where one of the value isn't a number. Throw an error if no pair of numbers is found.
 */
function getSumXAndY(
  arrayX: ArgValue,
  arrayY: ArgValue,
  cb: (x: number, y: number) => number
): number {
  assertSameDimensions(
    "The arguments array_x and array_y must have the same dimensions.",
    arrayX,
    arrayY
  );
  const _arrayX = toMatrixArgValue(arrayX);
  const _arrayY = toMatrixArgValue(arrayY);

  let validPairFound = false;
  let result = 0;
  for (const i in _arrayX) {
    for (const j in _arrayX[i]) {
      const arrayXValue = _arrayX[i][j];
      const arrayYValue = _arrayY[i][j];
      if (typeof arrayXValue !== "number" || typeof arrayYValue !== "number") {
        continue;
      }
      validPairFound = true;
      result += cb(arrayXValue, arrayYValue);
    }
  }

  if (!validPairFound) {
    throw new Error("The arguments array_x and array_y must contain at least one pair of numbers.");
  }

  return result;
}

export const SUMX2MY2: AddFunctionDescription = {
  description: _lt(
    "Calculates the sum of the difference of the squares of the values in two array."
  ),
  args: [
    arg(
      "array_x (number, range<number>)",
      _lt(
        "The array or range of values whose squares will be reduced by the squares of corresponding entries in array_y and added together."
      )
    ),
    arg(
      "array_y (number, range<number>)",
      _lt(
        "The array or range of values whose squares will be subtracted from the squares of corresponding entries in array_x and added together."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (arrayX: ArgValue, arrayY: ArgValue): number {
    return getSumXAndY(arrayX, arrayY, (x, y) => x ** 2 - y ** 2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUMX2PY2
// -----------------------------------------------------------------------------
export const SUMX2PY2: AddFunctionDescription = {
  description: _lt("Calculates the sum of the sum of the squares of the values in two array."),
  args: [
    arg(
      "array_x (number, range<number>)",
      _lt(
        "The array or range of values whose squares will be added to the squares of corresponding entries in array_y and added together."
      )
    ),
    arg(
      "array_y (number, range<number>)",
      _lt(
        "The array or range of values whose squares will be added to the squares of corresponding entries in array_x and added together."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (arrayX: ArgValue, arrayY: ArgValue): number {
    return getSumXAndY(arrayX, arrayY, (x, y) => x ** 2 + y ** 2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUMXMY2
// -----------------------------------------------------------------------------
export const SUMXMY2: AddFunctionDescription = {
  description: _lt("Calculates the sum of squares of the differences of values in two array."),
  args: [
    arg(
      "array_x (number, range<number>)",
      _lt(
        "The array or range of values that will be reduced by corresponding entries in array_y, squared, and added together."
      )
    ),
    arg(
      "array_y (number, range<number>)",
      _lt(
        "The array or range of values that will be subtracted from corresponding entries in array_x, the result squared, and all such results added together."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (arrayX: ArgValue, arrayY: ArgValue): number {
    return getSumXAndY(arrayX, arrayY, (x, y) => (x - y) ** 2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TOCOL
// -----------------------------------------------------------------------------
const TO_COL_ROW_DEFAULT_IGNORE = 0;
const TO_COL_ROW_DEFAULT_SCAN = false;
const TO_COL_ROW_ARGS = [
  arg("array (any, range<any>)", _lt("The array which will be transformed.")),
  arg(
    `ignore (number, default=${TO_COL_ROW_DEFAULT_IGNORE})`,
    _lt(
      "The control to ignore blanks and errors. 0 (default) is to keep all values, 1 is to ignore blanks, 2 is to ignore errors, and 3 is to ignore blanks and errors."
    )
  ),
  arg(
    `scan_by_column (number, default=${TO_COL_ROW_DEFAULT_SCAN})`,
    _lt(
      "Whether the array should be scanned by column. True scans the array by column and false (default) \
      scans the array by row."
    )
  ),
];

export const TOCOL: AddFunctionDescription = {
  description: _lt("Transforms a range of cells into a single column."),
  args: TO_COL_ROW_ARGS,
  returns: ["RANGE<ANY>"],
  //TODO compute format
  compute: function (
    array: ArgValue,
    ignore: PrimitiveArgValue = TO_COL_ROW_DEFAULT_IGNORE,
    scanByColumn: PrimitiveArgValue = TO_COL_ROW_DEFAULT_SCAN
  ): Matrix<CellValue> {
    const _array = toMatrixArgValue(array);
    const _ignore = toInteger(ignore);
    const _scanByColumn = toBoolean(scanByColumn);

    assert(() => _ignore >= 0 && _ignore <= 3, _lt("Argument ignore must be between 0 and 3"));

    const mappedFn = (acc: CellValue[], item: CellValue | undefined) => {
      // TODO : implement ignore value 2 (ignore error) & 3 (ignore blanks and errors) once we can have errors in
      // the array w/o crashing
      if ((_ignore === 1 || _ignore === 3) && (item === undefined || item === null)) {
        return acc;
      }

      acc.push(toCellValue(item));
      return acc;
    };

    const result = reduceAny([_array], mappedFn, [], _scanByColumn ? "colFirst" : "rowFirst");

    if (result.length === 0) {
      throw new NotAvailableError(_lt("No results for the given arguments of TOCOL."));
    }
    return [result];
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TOROW
// -----------------------------------------------------------------------------
export const TOROW: AddFunctionDescription = {
  description: _lt("Transforms a range of cells into a single row."),
  args: TO_COL_ROW_ARGS,
  returns: ["RANGE<ANY>"],
  //TODO compute format
  compute: function (
    array: ArgValue,
    ignore: PrimitiveArgValue = TO_COL_ROW_DEFAULT_IGNORE,
    scanByColumn: PrimitiveArgValue = TO_COL_ROW_DEFAULT_SCAN
  ): Matrix<CellValue> {
    const _array = toMatrixArgValue(array);
    const _ignore = toInteger(ignore);
    const _scanByColumn = toBoolean(scanByColumn);

    assert(() => _ignore >= 0 && _ignore <= 3, _lt("Argument ignore must be between 0 and 3"));

    const mappedFn = (acc: Matrix<CellValue>, item: CellValue | undefined) => {
      // TODO : implement ignore value 2 (ignore error) & 3 (ignore blanks and errors) once we can have errors in
      // the array w/o crashing
      if ((_ignore === 1 || _ignore === 3) && (item === undefined || item === null)) {
        return acc;
      }

      acc.push([toCellValue(item)]);
      return acc;
    };

    const result = reduceAny([_array], mappedFn, [], _scanByColumn ? "colFirst" : "rowFirst");

    if (result.length === 0 || result[0].length === 0) {
      throw new NotAvailableError(_lt("No results for the given arguments of TOROW."));
    }
    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TRANSPOSE
// -----------------------------------------------------------------------------
export const TRANSPOSE: AddFunctionDescription = {
  description: _lt("Transposes the rows and columns of a range."),
  args: [arg("range (any, range<any>)", _lt("The range to be transposed."))],
  returns: ["RANGE"],
  computeValueAndFormat: (arg: Arg) => {
    const values = isMatrix(arg.value) ? arg.value : [[arg.value]];
    const formats = isMatrix(arg.format) && arg.format !== undefined ? arg.format : [[arg.format]];
    const nColumns = values[0].length;
    const nRows = values.length;

    return mapBothValueAndFormat(nRows, nColumns, values, formats, (i, j, arg) => arg[j][i]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// VSTACK
// -----------------------------------------------------------------------------
export const VSTACK: AddFunctionDescription = {
  description: _lt("Appends ranges vertically and in sequence to return a larger array."),
  args: [
    arg("range1 (any, range<any>)", _lt("The first range to be appended.")),
    arg("range2 (any, range<any>, repeating)", _lt("Additional ranges to add to range1.")),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (...ranges: ArgValue[]): Matrix<CellValue> {
    const _ranges = ranges.map((range) => toMatrixArgValue(range));

    const nCols = Math.max(..._ranges.map((range) => range.length));
    const nRows = _ranges.reduce((acc, range) => acc + range[0].length, 0);

    const result: Matrix<CellValue> = Array(nCols)
      .fill([])
      .map(() => Array(nRows).fill(0)); // TODO fill with #N/A

    let currentRow = 0;
    for (const range of _ranges) {
      for (let col = 0; col < range.length; col++) {
        for (let row = 0; row < range[col].length; row++) {
          result[col][currentRow + row] = toCellValue(range[col][row]);
        }
      }
      currentRow += range[0].length;
    }

    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// WRAPCOLS
// -----------------------------------------------------------------------------
export const WRAPCOLS: AddFunctionDescription = {
  description: _lt(
    "Wraps the provided row or column of cells by columns after a specified number of elements to form a new array."
  ),
  args: [
    arg("range (any, range<any>)", _lt("The range to wrap.")),
    arg(
      "wrap_count (number)",
      _lt("The maximum number of cells for each column, rounded down to the nearest whole number.")
    ),
    arg(
      "pad_with  (any, default=0)", // TODO : replace with #N/A
      _lt("The value with which to fill the extra cells in the range.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (
    range: ArgValue,
    wrapCount: PrimitiveArgValue,
    padWith: PrimitiveArgValue = 0
  ): Matrix<CellValue> {
    const _range = toMatrixArgValue(range);
    const nOfRows = toInteger(wrapCount);
    const _padWith = padWith === null ? 0 : padWith;

    assertSingleColOrRow(_lt("Argument range must be a single row or column."), _range);

    const values = _range.flat();
    const nOfCols = Math.ceil(values.length / nOfRows);

    const result: Matrix<CellValue> = Array(nOfCols);
    for (let col = 0; col < nOfCols; col++) {
      result[col] = Array(nOfRows).fill(_padWith);
      for (let row = 0; row < nOfRows; row++) {
        const index = col * nOfRows + row;
        if (index < values.length) {
          result[col][row] = toCellValue(values[index]);
        }
      }
    }

    return result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// WRAPROWS
// -----------------------------------------------------------------------------
export const WRAPROWS: AddFunctionDescription = {
  description: _lt(
    "Wraps the provided row or column of cells by rows after a specified number of elements to form a new array."
  ),
  args: [
    arg("range (any, range<any>)", _lt("The range to wrap.")),
    arg(
      "wrap_count (number)",
      _lt("The maximum number of cells for each row, rounded down to the nearest whole number.")
    ),
    arg(
      "pad_with  (any, default=0)", // TODO : replace with #N/A
      _lt("The value with which to fill the extra cells in the range.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (
    range: ArgValue,
    wrapCount: PrimitiveArgValue,
    padWith: PrimitiveArgValue = 0
  ): Matrix<CellValue> {
    const _range = toMatrixArgValue(range);
    const nOfCols = toInteger(wrapCount);
    const _padWith = padWith === null ? 0 : padWith;

    assertSingleColOrRow(_lt("Argument range must be a single row or column."), _range);

    const values = _range.flat();
    const nOfRows = Math.ceil(values.length / nOfCols);
    const result: Matrix<CellValue> = Array(nOfCols)
      .fill([])
      .map(() => Array(nOfRows).fill(_padWith));

    for (let row = 0; row < nOfRows; row++) {
      for (let col = 0; col < nOfCols; col++) {
        const index = row * nOfCols + col;
        if (index < values.length) {
          result[col][row] = toCellValue(values[index]);
        }
      }
    }

    return result;
  },
  isExported: true,
};
