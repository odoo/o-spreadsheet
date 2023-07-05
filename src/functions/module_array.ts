import { _lt } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  CellValue,
  Format,
  Matrix,
  MatrixArg,
  MatrixArgValue,
  PrimitiveArg,
} from "../types";
import { NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import {
  assert,
  flattenRowFirst,
  toBoolean,
  toCellValue,
  toInteger,
  toMatrix,
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
import { mapBothValueAndFormat, mapValueAndFormat } from "./helper_math";
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
  computeValueAndFormat: (array: MatrixArg, rows: PrimitiveArg, columns: PrimitiveArg) => {
    const _values = toMatrixArgValue(array.value);
    const _formats = toMatrix(array.format);
    const _rowsArg = toInteger(rows.value);
    const _columnsArg = toInteger(columns.value);

    assertPositive(
      _lt("The rows argument (%s) must be strictly positive.", _rowsArg.toString()),
      _rowsArg
    );
    assertPositive(
      _lt("The columns argument (%s) must be strictly positive.", _rowsArg.toString()),
      _columnsArg
    );

    const _nbRows = Math.min(_rowsArg, _values[0].length);
    const _nbColumns = Math.min(_columnsArg, _values.length);

    return mapValueAndFormat(
      _nbRows,
      _nbColumns,
      array.format !== undefined,
      (i, j) => toCellValue(_values[i][j]),
      (i, j) => _formats?.[i]?.[j]
    );
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
  computeValueAndFormat: (array: MatrixArg, ...columns: PrimitiveArg[]) => {
    const _values = toMatrixArgValue(array.value);
    const _formats = toMatrix(array.format);
    const _columns = flattenRowFirst(
      columns.map((c) => c.value),
      toInteger
    );
    const _nbRows = _values[0].length;

    assert(
      () => _columns.every((col) => col > 0 && col <= _values.length),
      _lt(
        "The columns arguments must be between 1 and %s (got %s).",
        _values.length.toString(),
        (_columns.find((col) => col <= 0 || col > _values.length) || 0).toString()
      )
    );

    return mapValueAndFormat(
      _nbRows,
      _columns.length,
      array.format !== undefined,
      (i, j) => toCellValue(_values[_columns[i] - 1][j]),
      (i, j) => _formats?.[_columns[i] - 1]?.[j]
    );
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
  computeValueAndFormat: (array: MatrixArg, ...rows: PrimitiveArg[]) => {
    const _values = toMatrixArgValue(array.value);
    const _formats = toMatrix(array.format);
    const _rows = flattenRowFirst(
      rows.map((c) => c.value),
      toInteger
    );
    const _nbColumns = _values.length;

    assert(
      () => _rows.every((row) => row > 0 && row <= _values[0].length),
      _lt(
        "The rows arguments must be between 1 and %s (got %s).",
        _values[0].length.toString(),
        (_rows.find((row) => row <= 0 || row > _values[0].length) || 0).toString()
      )
    );

    return mapValueAndFormat(
      _rows.length,
      _nbColumns,
      array.format !== undefined,
      (i, j) => toCellValue(_values[i][_rows[j] - 1]),
      (i, j) => _formats?.[i]?.[_rows[j] - 1]
    );
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
  computeValueAndFormat: (
    arg: MatrixArg,
    rows: PrimitiveArg,
    columns?: PrimitiveArg,
    padWith: PrimitiveArg = { value: 0 }
  ) => {
    const _values = toMatrixArgValue(arg.value);
    const _formats = toMatrix(arg.format);
    const _nbRows = toInteger(rows.value);
    const _nbColumns = columns !== undefined ? toInteger(columns.value) : _values.length;
    const _padWithValue = padWith !== undefined && padWith.value !== null ? padWith.value : 0; // TODO : Replace with #N/A errors once it's supported
    const _padWithFormat = padWith?.format; // TODO : Replace with #N/A errors once it's supported

    assert(
      () => _nbRows >= _values[0].length,
      _lt(
        "The rows arguments (%s) must be greater or equal than the number of rows of the array.",
        _nbRows.toString()
      )
    );
    assert(
      () => _nbColumns >= _values.length,
      _lt(
        "The columns arguments (%s) must be greater or equal than the number of columns of the array.",
        _nbColumns.toString()
      )
    );

    return mapValueAndFormat(
      _nbRows,
      _nbColumns,
      arg.format !== undefined,
      (i, j) =>
        i >= _values.length || j >= _values[i].length ? _padWithValue : _values[i][j] ?? 0,
      (i, j) =>
        i >= _formats.length || j >= _formats[i].length ? _padWithFormat : _formats?.[i]?.[j]
    );
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
  computeValueAndFormat: (...ranges: Arg[]) => {
    const values: CellValue[] = [];
    const formats: (Format | undefined)[] = [];

    for (const range of ranges) {
      const _values = toMatrixArgValue(range.value);
      const _formats = toMatrix(range.format);
      for (let row = 0; row < _values[0].length; row++) {
        for (let col = 0; col < _values.length; col++) {
          values.push(toCellValue(_values[col][row]));
          formats.push(_formats?.[col]?.[row]);
        }
      }
    }
    return { value: [values], format: [formats] };
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
  computeValueAndFormat: (...ranges: Arg[]) => {
    const nbRows = Math.max(...ranges.map((r) => r.value?.[0]?.length ?? 0));

    const value: Matrix<CellValue> = [];
    const format: Matrix<Format | undefined> = [];

    for (const range of ranges) {
      const _values = toMatrixArgValue(range.value);
      const _formats = toMatrix(range.format);
      for (let col = 0; col < _values.length; col++) {
        const values: CellValue[] = Array(nbRows).fill(0);
        const formats: (Format | undefined)[] = Array(nbRows).fill(undefined);
        for (let row = 0; row < _values[col].length; row++) {
          values[row] = toCellValue(_values[col][row]);
          formats[row] = _formats?.[col]?.[row];
        }
        value.push(values);
        format.push(formats);
      }
    }
    return { value, format };
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
  computeValueAndFormat: function (
    array: Arg,
    ignore: PrimitiveArg = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: PrimitiveArg = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _values = toMatrixArgValue(array.value);
    const _formats = toMatrix(array.format);
    const _ignore = toInteger(ignore.value);
    const _scanByColumn = toBoolean(scanByColumn.value);

    assert(() => _ignore >= 0 && _ignore <= 3, _lt("Argument ignore must be between 0 and 3"));

    const result: CellValue[] = [];
    const formats: (Format | undefined)[] = [];
    const firstDim = _scanByColumn ? _values.length : _values[0].length;
    const secondDim = _scanByColumn ? _values[0].length : _values.length;

    for (let i = 0; i < firstDim; i++) {
      for (let j = 0; j < secondDim; j++) {
        const item = _scanByColumn ? _values[i][j] : _values[j][i];
        // TODO : implement ignore value 2 (ignore error) & 3 (ignore blanks and errors) once we can have errors in
        // the array w/o crashing
        if ((_ignore === 1 || _ignore === 3) && (item === undefined || item === null)) {
          continue;
        }
        result.push(toCellValue(item));
        formats.push(_scanByColumn ? _formats?.[i]?.[j] : _formats?.[j]?.[i]);
      }
    }

    if (result.length === 0) {
      throw new NotAvailableError(_lt("No results for the given arguments of TOCOL."));
    }
    return { value: [result], format: [formats] };
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
  computeValueAndFormat: function (
    array: Arg,
    ignore: PrimitiveArg = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: PrimitiveArg = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _values = toMatrixArgValue(array.value);
    const _formats = toMatrix(array.format);
    const _ignore = toInteger(ignore.value);
    const _scanByColumn = toBoolean(scanByColumn.value);

    assert(() => _ignore >= 0 && _ignore <= 3, _lt("Argument ignore must be between 0 and 3"));

    const result: CellValue[][] = [];
    const formats: (Format | undefined)[][] = [];
    const firstDim = _scanByColumn ? _values.length : _values[0].length;
    const secondDim = _scanByColumn ? _values[0].length : _values.length;

    for (let i = 0; i < firstDim; i++) {
      for (let j = 0; j < secondDim; j++) {
        const item = _scanByColumn ? _values[i][j] : _values[j][i];
        // TODO : implement ignore value 2 (ignore error) & 3 (ignore blanks and errors) once we can have errors in
        // the array w/o crashing
        if ((_ignore === 1 || _ignore === 3) && (item === undefined || item === null)) {
          continue;
        }
        result.push([toCellValue(item)]);
        formats.push([_scanByColumn ? _formats?.[i]?.[j] : _formats?.[j]?.[i]]);
      }
    }

    if (result.length === 0 || result[0].length === 0) {
      throw new NotAvailableError(_lt("No results for the given arguments of TOROW."));
    }
    return { value: result, format: formats };
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
    const values = toMatrixArgValue(arg.value);
    const formats = toMatrix(arg.format);
    const nbColumns = values[0].length;
    const nbRows = values.length;

    return mapBothValueAndFormat(nbRows, nbColumns, values, formats, (i, j, arg) => arg[j][i]);
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
  computeValueAndFormat: function (...ranges: Arg[]) {
    const nbColumns = Math.max(...ranges.map((range) => toMatrix(range.value).length));
    const nbRows = ranges.reduce((acc, range) => acc + toMatrix(range.value)[0].length, 0);

    const result: Matrix<CellValue> = Array(nbColumns)
      .fill([])
      .map(() => Array(nbRows).fill(0)); // TODO fill with #N/A
    const format: Matrix<Format | undefined> = Array(nbColumns)
      .fill([])
      .map(() => Array(nbRows).fill(undefined));

    let currentRow = 0;
    for (const range of ranges) {
      const _values = toMatrixArgValue(range.value);
      const _formats = toMatrix(range.format);
      for (let col = 0; col < _values.length; col++) {
        for (let row = 0; row < _values[col].length; row++) {
          result[col][currentRow + row] = toCellValue(_values[col][row]);
          format[col][currentRow + row] = _formats?.[col]?.[row];
        }
      }
      currentRow += _values[0].length;
    }

    return { value: result, format };
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
  computeValueAndFormat: (
    range: Arg,
    wrapCount: PrimitiveArg,
    padWith: PrimitiveArg = { value: 0 }
  ) => {
    const _values = toMatrixArgValue(range.value);
    const _formats = toMatrix(range.format);
    const nbRows = toInteger(wrapCount.value);
    const _padWithValue = padWith.value === null ? 0 : padWith.value;
    const _padWithFormat = padWith?.format;

    assertSingleColOrRow(_lt("Argument range must be a single row or column."), _values);

    const values = _values.flat();
    const formats = _formats.flat();
    const nbColumns = Math.ceil(values.length / nbRows);

    return mapValueAndFormat(
      nbRows,
      nbColumns,
      range.format !== undefined,
      (i, j) => {
        const index = i * nbRows + j;
        return index < values.length ? toCellValue(values[index]) : _padWithValue;
      },
      (i, j) => {
        const index = i * nbRows + j;
        return index < formats.length ? formats[index] : _padWithFormat;
      }
    );
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
  computeValueAndFormat: (
    range: Arg,
    wrapCount: PrimitiveArg,
    padWith: PrimitiveArg = { value: 0 }
  ) => {
    const _values = toMatrixArgValue(range.value);
    const _formats = toMatrix(range.format);
    const nbColumns = toInteger(wrapCount.value);
    const _padWithValue = padWith.value === null ? 0 : padWith.value;
    const _padWithFormat = padWith?.format;

    assertSingleColOrRow(_lt("Argument range must be a single row or column."), _values);

    const values = _values.flat();
    const formats = _formats.flat();
    const nbRows = Math.ceil(values.length / nbColumns);

    return mapValueAndFormat(
      nbRows,
      nbColumns,
      range.format !== undefined,
      (i, j) => {
        const index = j * nbColumns + i;
        return index < values.length ? toCellValue(values[index]) : _padWithValue;
      },
      (i, j) => {
        const index = j * nbColumns + i;
        return index < formats.length ? formats[index] : _padWithFormat;
      }
    );
  },
  isExported: true,
};
