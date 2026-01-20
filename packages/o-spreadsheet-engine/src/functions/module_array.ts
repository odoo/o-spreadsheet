import { evaluationResultToDisplayString } from "../helpers/matrix";
import { _t } from "../translation";
import { EvaluationError, NotAvailableError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { implementationErrorMessage } from "./create_compute_function";
import { isMimicMatrix, matrixToMimicMatrix, MimicMatrix, toMimicMatrix } from "./helper_arg";
import { areSameDimensions, isSquareMatrix } from "./helper_assert";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";
import {
  isEvaluationError,
  toBoolean,
  toInteger,
  toNumber,
  toNumberMatrix,
  toString,
} from "./helpers";

function stackHorizontally(
  ranges: Arg[],
  options?: { requireSameRowCount?: boolean }
): MimicMatrix | EvaluationError {
  const matrices = ranges.map(toMimicMatrix);
  const nbRowsArr = matrices.map((m) => m.height);

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

  const colSteps: number[] = [];
  let currentCol = 0;
  colSteps.push(...matrices.map((m) => (currentCol += m.width)));

  const nbCols = colSteps[colSteps.length - 1];
  const nbRows = Math.max(...nbRowsArr);
  return new MimicMatrix(nbCols, nbRows, (col, row) => {
    for (let i = 0; i < colSteps.length; i++) {
      const prevStepValue = i === 0 ? 0 : colSteps[i - 1];
      if (col < colSteps[i]) {
        // colSteps is an array of increasing values
        if (row < matrices[i].height) {
          return matrices[i].get(col - prevStepValue, row);
        }
        return { value: null };
      }
    }
    return { value: null };
  });
}

function stackVertically(
  ranges: Arg[],
  options?: { requireSameColCount?: boolean }
): MimicMatrix | EvaluationError {
  const matrices = ranges.map(toMimicMatrix);
  const nbColsArr = matrices.map((m) => m.width);

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

  const rowSteps: number[] = [];
  let currentRow = 0;
  rowSteps.push(...matrices.map((m) => (currentRow += m.height)));

  const nbCols = Math.max(...nbColsArr);
  const nbRows = rowSteps[rowSteps.length - 1];
  return new MimicMatrix(nbCols, nbRows, (col, row) => {
    for (let i = 0; i < rowSteps.length; i++) {
      const prevStepValue = i === 0 ? 0 : rowSteps[i - 1];
      if (row < rowSteps[i]) {
        // rowSteps is an array of increasing values
        if (col < matrices[i].width) {
          return matrices[i].get(col, row - prevStepValue);
        }
        return { value: null };
      }
    }
    return { value: null };
  });
}

// -----------------------------------------------------------------------------
// ARRAY.CONSTRAIN
// -----------------------------------------------------------------------------
export const ARRAY_CONSTRAIN = {
  description: _t("Returns a result array constrained to a specific width and height."),
  args: [
    arg("input_range (any, range<any>)", _t("The range to constrain.")),
    arg("rows (number)", _t("The number of rows in the constrained array.")),
    arg("columns (number)", _t("The number of columns in the constrained array.")),
  ],
  compute: function (
    array: Arg,
    rows: Maybe<FunctionResultObject>,
    columns: Maybe<FunctionResultObject>
  ) {
    const _array = toMimicMatrix(array);
    const _rowsArg = toInteger(rows?.value, this.locale);
    const _columnsArg = toInteger(columns?.value, this.locale);

    if (_rowsArg <= 0) {
      return new EvaluationError(
        _t("The rows argument (%s) must be strictly positive.", _rowsArg.toString())
      );
    }
    if (_columnsArg <= 0) {
      return new EvaluationError(
        _t("The columns argument (%s) must be strictly positive.", _columnsArg.toString())
      );
    }

    const _nbRows = Math.min(_rowsArg, _array.height);
    const _nbColumns = Math.min(_columnsArg, _array.width);

    return new MimicMatrix(_nbColumns, _nbRows, (col, row) => _array.get(col, row));
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
  compute: function (...ranges: Arg[]) {
    return stackVertically(ranges, { requireSameColCount: true });
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
  compute: function (...ranges: Arg[]) {
    return stackHorizontally(ranges, { requireSameRowCount: true });
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
    arg("array (any, range<any>)", _t("The array that contains the columns to be returned.")),
    arg(
      "col_num (number, range<number>, repeating)",
      _t("The column index of the column to be returned.")
    ),
  ],
  compute: function (array: Arg, ...columns: Arg[]) {
    const _array = toMimicMatrix(array);

    const _columns = columns
      .flatMap((arg) => (isMimicMatrix(arg) ? arg.flatten("rowFirst") : [arg]))
      .map((item) => toInteger(item?.value, this.locale));

    const argOutOfRange = _columns.filter((col) => col === 0 || _array.width < Math.abs(col));
    if (argOutOfRange.length !== 0) {
      return new EvaluationError(
        _t(
          "The columns arguments must be between -%s and %s (got %s), excluding 0.",
          _array.width.toString(),
          _array.width.toString(),
          argOutOfRange.join(",")
        )
      );
    }

    const result = new MimicMatrix(_columns.length, _array.height, (col, row) => {
      if (_columns[col] > 0) {
        return _array.get(_columns[col] - 1, row); // -1 because columns arguments are 1-indexed
      }
      return _array.get(_array.width + _columns[col], row);
    });

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
  compute: function (array: Arg, ...rows: Arg[]) {
    const _array = toMimicMatrix(array);
    const _rows = rows
      .flatMap((arg) => (isMimicMatrix(arg) ? arg.flatten("rowFirst") : [arg]))
      .map((item) => toInteger(item?.value, this.locale));

    const argOutOfRange = _rows.filter((row) => row === 0 || _array.height < Math.abs(row));
    if (argOutOfRange.length !== 0) {
      return new EvaluationError(
        _t(
          "The rows arguments must be between -%s and %s (got %s), excluding 0.",
          _array.height.toString(),
          _array.height.toString(),
          argOutOfRange.join(",")
        )
      );
    }

    return new MimicMatrix(_array.width, _rows.length, (col, row) => {
      if (_rows[row] > 0) {
        return _array.get(col, _rows[row] - 1); // -1 because rows arguments are 1-indexed
      }
      return _array.get(col, _array.height + _rows[row]);
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
  compute: function (
    arg: Arg,
    rows: Maybe<FunctionResultObject>,
    columns?: Maybe<FunctionResultObject>,
    padWith: Maybe<FunctionResultObject> = { value: 0 } // TODO : Replace with #N/A errors once it's supported
  ) {
    const _array = toMimicMatrix(arg);
    const _nbRows = toInteger(rows?.value, this.locale);
    const _nbColumns = columns !== undefined ? toInteger(columns.value, this.locale) : _array.width;

    if (_nbRows < _array.height) {
      return new EvaluationError(
        _t(
          "The rows arguments (%s) must be greater or equal than the number of rows of the array.",
          _nbRows.toString()
        )
      );
    }

    if (_nbColumns < _array.width) {
      return new EvaluationError(
        _t(
          "The columns arguments (%s) must be greater or equal than the number of columns of the array.",
          _nbColumns.toString()
        )
      );
    }

    return new MimicMatrix(_nbColumns, _nbRows, (col, row) =>
      col >= _array.width || row >= _array.height ? padWith : _array.get(col, row)
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLATTEN
// -----------------------------------------------------------------------------
export const FLATTEN = {
  description: _t("Flattens all the values from one or more ranges into a single column."),
  args: [arg("range (any, range<any>, repeating)", _t("The range to flatten."))],
  compute: function (...ranges: Arg[]) {
    const steps: number[] = [];
    let currentIndex = 0;
    steps.push(
      ...ranges.map((arg) => (currentIndex += isMimicMatrix(arg) ? arg.height * arg.width : 1))
    );

    return new MimicMatrix(1, steps[steps.length - 1], (col, row) => {
      for (let i = 0; i < steps.length; i++) {
        if (row < steps[i]) {
          const arg = ranges[i];
          if (!isMimicMatrix(arg)) {
            return arg === undefined ? { value: "" } : arg;
          }
          const prevStepValue = i === 0 ? 0 : steps[i - 1];
          const positionInRange = row - prevStepValue; // position is the position in the flattened range
          return arg.get(positionInRange % arg.width, Math.floor(positionInRange / arg.width));
        }
      }
      return new EvaluationError(
        implementationErrorMessage + " In FLATTEN function: could not find value at position."
      );
    });
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
  compute: function (data: MimicMatrix, classes: Arg) {
    // TO DO: use reduceNumber here
    const _data = data
      .flatten("rowFirst")
      .map((obj) => obj.value)
      .filter((val): val is number => typeof val === "number");
    if (classes === undefined) {
      return new EvaluationError(_t("The classes argument is required."));
    }
    const _classes = (isMimicMatrix(classes) ? classes.flatten("rowFirst") : [classes])
      .map((obj) => obj.value)
      .filter((val): val is number => typeof val === "number");
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
    return new MimicMatrix(1, result.length, (col, row) => ({ value: result[row] }));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// HSTACK
// -----------------------------------------------------------------------------
export const HSTACK = {
  description: _t("Appends ranges horizontally and in sequence to return a larger array."),
  args: [arg("range (any, range<any>, repeating)", _t("The range to be appended."))],
  compute: function (...ranges: Arg[]) {
    return stackHorizontally(ranges);
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
  compute: function (matrix: Arg) {
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
    return new MimicMatrix(_matrix.length, _matrix.length, (col, row) => ({
      value: inverted[col][row],
    }));
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
  compute: function (matrix1: Arg, matrix2: Arg) {
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

    return matrixToMimicMatrix(multiplyMatrices(_matrix1, _matrix2));
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
    const _args = args.map(toMimicMatrix);
    let result = 0;
    for (let col = 0; col < _args[0].width; col++) {
      for (let row = 0; row < _args[0].height; row++) {
        // prefer a 'every' implementation and not a 'some' to force accessing all
        // elements in ranges to store indirectly corresponding dependencies
        // But in practice, we could see if other spreadsheets tools do that
        if (!_args.every((range) => typeof range.get(col, row).value === "number")) {
          continue;
        }
        let product = 1;
        for (const range of _args) {
          product *= toNumber(range.get(col, row), this.locale);
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
function getSumXAndY(
  arrayX: Arg,
  arrayY: Arg,
  cb: (x: number, y: number) => number
): FunctionResultObject {
  if (!areSameDimensions(arrayX, arrayY)) {
    // TO DO: see if we want to store dependencies on all cells even in error case
    // in theory no, because dimensions depend only on what user writes in the formula
    // so when changing dimensions of one of the arrays, the formula should recalculate
    // But what happens with the range selector (#) if one of the ranges change size ?
    return new EvaluationError(
      _t("The arguments array_x and array_y must have the same dimensions.")
    );
  }
  const _arrayX = toMimicMatrix(arrayX);
  const _arrayY = toMimicMatrix(arrayY);

  let validPairFound = false;
  let result = 0;
  for (let col = 0; col < _arrayX.width; col++) {
    for (let row = 0; row < _arrayX.height; row++) {
      const arrayXValue = _arrayX.get(col, row).value;
      const arrayYValue = _arrayY.get(col, row).value;
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

  return { value: result };
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
  compute: function (arrayX: Arg, arrayY: Arg) {
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
  compute: function (arrayX: Arg, arrayY: Arg) {
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

// TO DO: When keeping all values, consider whether values are accessed directly ?
// which may affect whether dependencies are stored.
export const TOCOL = {
  description: _t("Transforms a range of cells into a single column."),
  args: TO_COL_ROW_ARGS,
  compute: function (
    array: Arg,
    ignore: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _array = toMimicMatrix(array);
    const _ignore = toNumber(ignore.value, this.locale);
    const _scanByColumn = toBoolean(scanByColumn.value);
    const result = _array
      .flatten(_scanByColumn ? "colFirst" : "rowFirst")
      .filter(shouldKeepValue(_ignore));
    if (result.length === 0) {
      return new NotAvailableError(_t("No results for the given arguments of TOCOL."));
    }
    return matrixToMimicMatrix([result]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TOROW
// -----------------------------------------------------------------------------

// TO DO: When keeping all values, consider whether values are accessed directly ?
// which may affect whether dependencies are stored.
export const TOROW = {
  description: _t("Transforms a range of cells into a single row."),
  args: TO_COL_ROW_ARGS,
  compute: function (
    array: Arg,
    ignore: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_IGNORE },
    scanByColumn: Maybe<FunctionResultObject> = { value: TO_COL_ROW_DEFAULT_SCAN }
  ) {
    const _array = toMimicMatrix(array);
    const _ignore = toNumber(ignore.value, this.locale);
    const _scanByColumn = toBoolean(scanByColumn.value);
    const result = matrixToMimicMatrix(
      _array
        .flatten(_scanByColumn ? "colFirst" : "rowFirst")
        .filter(shouldKeepValue(_ignore))
        .map((item) => [item])
    );

    if (result.height === 0) {
      return new NotAvailableError(_t("No results for the given arguments of TOROW."));
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
  compute: function (arg: Arg) {
    return toMimicMatrix(arg).transpose();
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VSTACK
// -----------------------------------------------------------------------------
export const VSTACK = {
  description: _t("Appends ranges vertically and in sequence to return a larger array."),
  args: [arg("range (any, range<any>, repeating)", _t("The range to be appended."))],
  compute: function (...ranges: Arg[]) {
    return stackVertically(ranges);
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
      "pad_with  (any, default=0)", // TO DO : replace with #N/A
      _t("The value with which to fill the extra cells in the range.")
    ),
  ],
  compute: function (
    range: Arg,
    wrapCount: Maybe<FunctionResultObject>,
    padWith: Maybe<FunctionResultObject> = { value: 0 }
  ) {
    const _array = toMimicMatrix(range);
    const nbRows = toInteger(wrapCount?.value, this.locale);

    if (!_array.isSingleColOrRow()) {
      return new EvaluationError(_t("Argument range must be a single row or column."));
    }

    if (nbRows <= 0) {
      return new EvaluationError(
        _t('Argument wrap_count value is "%s", it should be greater or equal to 1.', nbRows)
      );
    }

    if (_array.width > _array.height) {
      // it's a single row
      const nbColumns = Math.ceil(_array.width / nbRows);
      return new MimicMatrix(nbColumns, nbRows, (col, row) => {
        const index = col * nbRows + row;
        return index < _array.width ? _array.get(index, 0) : padWith;
      });
    }

    const nbColumns = Math.ceil(_array.height / nbRows);
    return new MimicMatrix(nbColumns, nbRows, (col, row) => {
      const index = col * nbRows + row;
      return index < _array.height ? _array.get(0, index) : padWith;
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
      "pad_with  (any, default=0)", // TO DO : replace with #N/A
      _t("The value with which to fill the extra cells in the range.")
    ),
  ],
  compute: function (
    range: Arg,
    wrapCount: Maybe<FunctionResultObject>,
    padWith: Maybe<FunctionResultObject> = { value: 0 }
  ) {
    const _array = toMimicMatrix(range);
    const nbColumns = toInteger(wrapCount?.value, this.locale);

    if (!_array.isSingleColOrRow()) {
      return new EvaluationError(_t("Argument range must be a single row or column."));
    }

    if (nbColumns <= 0) {
      return new EvaluationError(
        _t('Argument wrap_count value is "%s", it should be greater or equal to 1.', nbColumns)
      );
    }

    if (_array.width > _array.height) {
      // it's a single row
      const nbRows = Math.ceil(_array.width / nbColumns);
      return new MimicMatrix(nbColumns, nbRows, (col, row) => {
        const index = row * nbColumns + col;
        return index < _array.width ? _array.get(index, 0) : padWith;
      });
    }

    const nbRows = Math.ceil(_array.height / nbColumns);
    return new MimicMatrix(nbColumns, nbRows, (col, row) => {
      const index = row * nbColumns + col;
      return index < _array.height ? _array.get(0, index) : padWith;
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
  // TO DO: check if normal args must be accepted on array argument
  compute: function (array: MimicMatrix, format: Maybe<FunctionResultObject> = { value: 0 }) {
    const _format = toNumber(format, this.locale);
    const _array = toMimicMatrix(array);

    if (_format === 1) {
      return { value: evaluationResultToDisplayString(_array.getAll(), "", this.locale) };
    }

    if (_format === 0) {
      const rowSeparator = this.locale.decimalSeparator === "," ? "/" : ",";
      const arrayStr = _array
        .flatten("rowFirst")
        .map((obj) => {
          return isEvaluationError(obj.value) ? obj.value : toString(obj);
        })
        .join(rowSeparator);
      return { value: arrayStr };
    }

    return new EvaluationError(_t("Format must be 0 or 1"));
  },
  isExported: true,
} satisfies AddFunctionDescription;
