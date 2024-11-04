import { range } from "../helpers";
import { cellsSortingCriterion } from "../helpers/sort";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  CellValue,
  CellValueType,
  FunctionResultObject,
  Locale,
  Matrix,
  Maybe,
  isMatrix,
} from "../types";
import { EvaluationError, NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import { assertSameDimensions, assertSingleColOrRow } from "./helper_assert";
import { toScalar } from "./helper_matrices";
import { assert, matrixMap, toBoolean, toMatrix, toNumber, transposeMatrix } from "./helpers";

function sortMatrix(
  matrix: Matrix<FunctionResultObject>,
  locale: Locale,
  ...criteria: Arg[]
): Matrix<FunctionResultObject> {
  for (const [i, value] of criteria.entries()) {
    assert(
      () => value !== undefined,
      _t(
        "Value for parameter %d is missing, while the function [[FUNCTION_NAME]] expect a number or a range.",
        i + 1
      )
    );
  }
  const sortingOrders: ("ascending" | "descending")[] = [];
  const sortColumns: Matrix<CellValue> = [];
  const nRows = matrix.length;
  for (let i = 0; i < criteria.length; i += 2) {
    sortingOrders.push(toBoolean(toScalar(criteria[i + 1])?.value) ? "ascending" : "descending");
    const sortColumn = criteria[i];
    if (isMatrix(sortColumn) && (sortColumn.length > 1 || sortColumn[0].length > 1)) {
      assert(
        () => sortColumn.length === 1 && sortColumn[0].length === nRows,
        _t(
          "Wrong size for %s. Expected a range of size 1x%s. Got %sx%s.",
          `sort_column${i + 1}`,
          nRows,
          sortColumn.length,
          sortColumn[0].length
        )
      );
      sortColumns.push(sortColumn.flat().map((c) => c.value));
    } else {
      const colIndex = toNumber(toScalar(sortColumn)?.value, locale);
      if (colIndex < 1 || colIndex > matrix[0].length) {
        return matrix;
      }
      sortColumns.push(matrix.map((row) => row[colIndex - 1].value));
    }
  }
  if (sortColumns.length === 0) {
    for (let i = 0; i < matrix[0].length; i++) {
      sortColumns.push(matrix.map((row) => row[i].value));
      sortingOrders.push("ascending");
    }
  }
  const sortingCriteria = {
    descending: cellsSortingCriterion("descending"),
    ascending: cellsSortingCriterion("ascending"),
  };
  const indexes = range(0, matrix.length);
  indexes.sort((a, b) => {
    for (const [i, sortColumn] of sortColumns.entries()) {
      const left = sortColumn[a];
      const right = sortColumn[b];
      const leftCell = {
        value: left,
        type:
          left === null
            ? CellValueType.empty
            : typeof left === "string"
            ? CellValueType.text
            : (typeof left as CellValueType),
      };
      const rightCell = {
        value: right,
        type:
          right === null
            ? CellValueType.empty
            : typeof right === "string"
            ? CellValueType.text
            : (typeof right as CellValueType),
      };
      const result = sortingCriteria[sortingOrders[i]](leftCell, rightCell);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
  return indexes.map((i) => matrix[i]);
}

// -----------------------------------------------------------------------------
// FILTER
// -----------------------------------------------------------------------------
export const FILTER = {
  description: _t(
    "Returns a filtered version of the source range, returning only rows or columns that meet the specified conditions."
  ),
  // TODO modify args description when vectorization on formulas is available
  args: [
    arg("range (any, range<any>)", _t("The data to be filtered.")),
    arg(
      "condition1 (boolean, range<boolean>)",
      _t(
        "A column or row containing true or false values corresponding to the first column or row of range."
      )
    ),
    arg(
      "condition2 (boolean, range<boolean>, repeating)",
      _t("Additional column or row containing true or false values.")
    ),
  ],
  compute: function (range: Arg, ...conditions: Arg[]) {
    let _array = toMatrix(range);
    const _conditionsMatrices = conditions.map((cond) =>
      matrixMap(toMatrix(cond), (data) => data.value)
    );
    _conditionsMatrices.map((c) =>
      assertSingleColOrRow(_t("The arguments condition must be a single column or row."), c)
    );
    assertSameDimensions(
      _t("The arguments conditions must have the same dimensions."),
      ...conditions
    );
    const _conditions = _conditionsMatrices.map((c) => c.flat());

    const mode = _conditionsMatrices[0].length === 1 ? "row" : "col";
    _array = mode === "row" ? transposeMatrix(_array) : _array;
    assert(
      () => _conditions.every((cond) => cond.length === _array.length),
      _t("FILTER has mismatched sizes on the range and conditions.")
    );

    const result: Matrix<FunctionResultObject> = [];
    for (let i = 0; i < _array.length; i++) {
      const row = _array[i];
      if (
        _conditions.every((c) => (typeof c[i] === "boolean" || typeof c[i] === "number") && c[i])
      ) {
        result.push(row);
      }
    }

    if (!result.length) {
      return new NotAvailableError(_t("No match found in FILTER evaluation"));
    }

    return mode === "row" ? transposeMatrix(result) : result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SORT
// -----------------------------------------------------------------------------
export const SORT: AddFunctionDescription = {
  description: _t("Sorts the rows of a given array or range by the values in one or more columns."),
  args: [
    arg("range (range)", _t("The data to be sorted.")),
    arg(
      "sort_column (any, range<number>, repeating)",
      _t(
        "The index of the column in range or a range outside of range containing the values by which to sort."
      )
    ),
    arg(
      "is_ascending (boolean, repeating)",
      _t(
        "TRUE or FALSE indicating whether to sort sort_column in ascending order. FALSE sorts in descending order."
      )
    ),
  ],
  compute: function (
    range: Matrix<FunctionResultObject>,
    ...sortingCriteria: Arg[]
  ): Matrix<FunctionResultObject> {
    const _range = transposeMatrix(range);
    return transposeMatrix(sortMatrix(_range, this.locale, ...sortingCriteria));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SORTN
// -----------------------------------------------------------------------------
export const SORTN: AddFunctionDescription = {
  description: _t("Returns the first n items in a data set after performing a sort."),
  args: [
    arg("range (range)", _t("The data to be sorted.")),
    arg("n (number, default=1)", _t("The number of items to return.")),
    arg(
      "display_ties_mode (number, default=0)",
      _t("A number representing the way to display ties.")
    ),
    arg(
      "sort_column (number, range<number>, repeating)",
      _t(
        "The index of the column in range or a range outside of range containing the values by which to sort."
      )
    ),
    arg(
      "is_ascending (boolean, repeating)",
      _t(
        "TRUE or FALSE indicating whether to sort sort_column in ascending order. FALSE sorts in descending order."
      )
    ),
  ],
  compute: function (
    range: Matrix<FunctionResultObject>,
    n: Maybe<FunctionResultObject>,
    displayTiesMode: Maybe<FunctionResultObject>,
    ...sortingCriteria: (FunctionResultObject | Matrix<FunctionResultObject>)[]
  ): any {
    const _n = toNumber(n?.value ?? 1, this.locale);
    assert(() => _n >= 0, _t("Wrong value of 'n'. Expected a positive number. Got %s.", _n));
    const _displayTiesMode = toNumber(displayTiesMode?.value ?? 0, this.locale);
    assert(
      () => _displayTiesMode >= 0 && _displayTiesMode <= 3,
      _t(
        "Wrong value of 'display_ties_mode'. Expected a positive number between 0 and 3. Got %s.",
        _displayTiesMode
      )
    );
    const sortedData = sortMatrix(transposeMatrix(range), this.locale, ...sortingCriteria);
    const sameRows = (i: number, j: number) =>
      JSON.stringify(sortedData[i].map((c) => c.value)) ===
      JSON.stringify(sortedData[j].map((c) => c.value));
    /*
     * displayTiesMode determine how ties (equal values) are dealt with:
     * 0 - ignore ties and show first n rows only
     * 1 - show first n rows plus any additional ties with nth row
     * 2 - show n rows but remove duplicates
     * 3 - show first n unique rows and all duplicates of these rows
     */
    switch (_displayTiesMode) {
      case 0:
        return transposeMatrix(sortedData.slice(0, _n));
      case 1:
        for (let i = _n; i < sortedData.length; i++) {
          if (!sameRows(i, _n - 1)) {
            return transposeMatrix(sortedData.slice(0, i));
          }
        }
        return transposeMatrix(sortedData);
      case 2: {
        const uniques = [sortedData[0]];
        for (let i = 1; i < sortedData.length; i++) {
          for (let j = 0; j < i; j++) {
            if (sameRows(i, j)) {
              break;
            }
            if (j === i - 1) {
              uniques.push(sortedData[i]);
            }
          }
        }
        return transposeMatrix(uniques.slice(0, _n));
      }
      case 3: {
        const uniques = [sortedData[0]];
        let counter = 1;
        for (let i = 1; i < sortedData.length; i++) {
          if (!sameRows(i, i - 1)) {
            counter++;
          }
          if (counter > _n) {
            break;
          }
          uniques.push(sortedData[i]);
        }
        return transposeMatrix(uniques);
      }
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// UNIQUE
// -----------------------------------------------------------------------------
export const UNIQUE = {
  description: _t("Unique rows in the provided source range."),
  args: [
    arg("range (any, range<any>)", _t("The data to filter by unique entries.")),
    arg(
      "by_column (boolean, default=FALSE)",
      _t("Whether to filter the data by columns or by rows.")
    ),
    arg(
      "exactly_once (boolean, default=FALSE)",
      _t("Whether to return only entries with no duplicates.")
    ),
  ],
  compute: function (
    range: Arg = { value: "" },
    byColumn: Maybe<FunctionResultObject>,
    exactlyOnce: Maybe<FunctionResultObject>
  ): Matrix<FunctionResultObject> {
    if (!isMatrix(range)) {
      return [[range]];
    }

    const _byColumn = toBoolean(byColumn?.value) || false;
    const _exactlyOnce = toBoolean(exactlyOnce?.value) || false;
    if (!_byColumn) {
      range = transposeMatrix(range);
    }

    const map: Map<string, { data: FunctionResultObject[]; count: number }> = new Map();

    for (const data of range) {
      const key = JSON.stringify(data.map((item) => item.value));
      const occurrence = map.get(key);
      if (!occurrence) {
        map.set(key, { data, count: 1 });
      } else {
        occurrence.count++;
      }
    }

    const result: Matrix<FunctionResultObject> = [];
    for (const row of map.values()) {
      if (_exactlyOnce && row.count > 1) {
        continue;
      }
      result.push(row.data);
    }

    if (!result.length) throw new EvaluationError(_t("No unique values found"));

    return _byColumn ? result : transposeMatrix(result);
  },
  isExported: true,
} satisfies AddFunctionDescription;
