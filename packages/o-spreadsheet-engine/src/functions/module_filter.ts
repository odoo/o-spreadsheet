import { range } from "../helpers/misc";
import { cellsSortingCriterion } from "../helpers/sort";
import { _t } from "../translation";
import { CellValue, CellValueType } from "../types/cells";
import { EvaluationError, NotAvailableError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Locale } from "../types/locale";
import { Arg, FunctionResultObject, Matrix, Maybe, SortDirection } from "../types/misc";
import { arg } from "./arguments";
import { isMimicMatrix, MimicMatrix, toMimicMatrix, toScalarMimicMatrix } from "./helper_arg";
import { areSameDimensions, assert } from "./helper_assert";
import { toBoolean, toNumber } from "./helpers";

// TO DO: see to rewrite sortMatrix to avoid to transpose twice in SORT and SORTN
function sortMatrix(matrix: MimicMatrix, locale: Locale, ...criteria: Arg[]): MimicMatrix {
  for (let i = 0; i < criteria.length; i++) {
    const param = i % 2 === 0 ? "sort_column" : "is_ascending";
    assert(
      criteria[i] !== undefined,
      _t("Value for parameter %s is missing in [[FUNCTION_NAME]].", param)
    );
  }
  const sortingOrders: SortDirection[] = [];
  const sortColumns: Matrix<CellValue> = [];
  const nRows = matrix.width;
  for (let i = 0; i < criteria.length; i += 2) {
    sortingOrders.push(toBoolean(toScalarMimicMatrix(criteria[i + 1])?.value) ? "asc" : "desc");
    const sortColumn = criteria[i];
    if (isMimicMatrix(sortColumn) && (sortColumn.width > 1 || sortColumn.height > 1)) {
      assert(
        sortColumn.width === 1 && sortColumn.height === nRows,
        _t(
          "Wrong size for %s. Expected a range of size 1x%s. Got %sx%s.",
          `sort_column${i + 1}`,
          nRows,
          sortColumn.width,
          sortColumn.height
        )
      );
      sortColumns.push(sortColumn.flatten("rowFirst", (c) => c.value));
    } else {
      const colIndex = toNumber(toScalarMimicMatrix(sortColumn)?.value, locale);
      if (colIndex < 1 || colIndex > matrix.height) {
        return matrix;
      }
      sortColumns.push(matrix.getRow(colIndex - 1).flatten("rowFirst", (c) => c.value));
    }
  }
  if (sortColumns.length === 0) {
    for (let i = 0; i < matrix.height; i++) {
      sortColumns.push(matrix.getRow(i).flatten("rowFirst", (c) => c.value));
      sortingOrders.push("asc");
    }
  }
  const sortingCriteria = {
    desc: cellsSortingCriterion("desc"),
    asc: cellsSortingCriterion("asc"),
  };
  const indexes = range(0, matrix.width);
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
  return new MimicMatrix(indexes.length, matrix.height, (zone) => {
    const partialWidth = zone.right - zone.left + 1;
    const result = new Array(partialWidth);
    for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
      result[colIndex] = matrix.getZone({
        top: zone.top,
        left: indexes[zone.left + colIndex],
        bottom: zone.bottom,
        right: indexes[zone.left + colIndex],
      })[0];
    }
    return result;
  });
}

// -----------------------------------------------------------------------------
// FILTER
// -----------------------------------------------------------------------------
export const FILTER = {
  description: _t(
    "Returns a filtered version of the source range, returning only rows or columns that meet the specified conditions."
  ),
  args: [
    arg("range (any, range<any>)", _t("The data to be filtered.")),
    arg(
      "condition (boolean, range<boolean>, repeating)",
      _t("Column or row containing true or false values corresponding to the range.")
    ),
  ],
  compute: function (range: Arg, ...conditions: Arg[]) {
    const _array = toMimicMatrix(range);
    const _conditions = conditions.map((cond) => toMimicMatrix(cond));

    for (const c of _conditions) {
      if (!c.isSingleColOrRow()) {
        return new EvaluationError(_t("The arguments condition must be a single column or row."));
      }
    }
    if (!areSameDimensions(...conditions)) {
      return new EvaluationError(_t("The arguments conditions must have the same dimensions."));
    }

    const filterByRow = _conditions[0].width === 1 ? true : false;
    if (
      (!filterByRow && _conditions[0].width !== _array.width) ||
      (filterByRow && _conditions[0].height !== _array.height)
    ) {
      return new EvaluationError(_t("FILTER has mismatched sizes on the range and conditions."));
    }

    const length = filterByRow ? _array.height : _array.width;
    const validIndexes: number[] = [];

    for (let idx = 0; idx < length; idx++) {
      let everyPositive = true;
      for (let i = 0; i < _conditions.length; i++) {
        const value = filterByRow
          ? _conditions[i].get(0, idx).value
          : _conditions[i].get(idx, 0).value;
        const isBoolean = typeof value === "boolean" || typeof value === "number";
        if (!isBoolean || !value) {
          everyPositive = false;
          break;
        }
      }
      if (everyPositive) {
        validIndexes.push(idx);
      }
    }

    if (validIndexes.length === 0) {
      return new NotAvailableError(_t("No match found in FILTER evaluation"));
    }

    if (filterByRow) {
      return new MimicMatrix(_array.width, validIndexes.length, (zone) => {
        const partialHeight = zone.bottom - zone.top + 1;
        const partialWidth = zone.right - zone.left + 1;

        const result = new Array(partialWidth);
        for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
          result[colIndex] = new Array(partialHeight);
        }

        for (let rowIndex = 0; rowIndex < partialHeight; rowIndex++) {
          const rowResult = _array.getZone({
            top: validIndexes[zone.top + rowIndex],
            left: zone.left,
            bottom: validIndexes[zone.top + rowIndex],
            right: zone.right,
          });
          for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
            result[colIndex][rowIndex] = rowResult[colIndex][0];
          }
        }

        return result;
      });
    }
    return new MimicMatrix(validIndexes.length, _array.height, (zone) => {
      const partialWidth = zone.right - zone.left + 1;
      const result = new Array(partialWidth);
      for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
        result[colIndex] = _array.getZone({
          top: zone.top,
          left: validIndexes[zone.left + colIndex],
          bottom: zone.bottom,
          right: validIndexes[zone.left + colIndex],
        })[0];
      }
      return result;
    });
  },
  isExported: false,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SORT
// -----------------------------------------------------------------------------
export const SORT: AddFunctionDescription = {
  description: _t("Sorts the rows of a given array or range by the values in one or more columns."),
  args: [
    arg("range (range)", _t("The data to be sorted.")),
    arg(
      "sort_column (any, range<number>, repeating, optional)",
      _t(
        "The index of the column in range or a range outside of range containing the value by which to sort."
      )
    ),
    arg(
      "is_ascending (boolean, repeating, optional)",
      _t(
        "TRUE or FALSE indicating whether to sort sort_column in ascending order. FALSE sorts in descending order."
      ),
      [
        { value: true, label: _t("Ascending") },
        { value: false, label: _t("Descending") },
      ]
    ),
  ],
  compute: function (range: MimicMatrix, ...sortingCriteria: Arg[]) {
    const _range = range.transpose();
    return sortMatrix(_range, this.locale, ...sortingCriteria).transpose();
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
    arg("n (number)", _t("The number of items to return.")),
    arg(
      "display_ties_mode (number, default=0)",
      _t("A number representing the way to display ties.")
    ),
    arg(
      "sort_column (number, range<number>, repeating, optional)",
      _t(
        "The index of the column in range or a range outside of range containing the value by which to sort."
      )
    ),
    arg(
      "is_ascending (boolean, repeating, optional)",
      _t(
        "TRUE or FALSE indicating whether to sort sort_column in ascending order. FALSE sorts in descending order."
      ),
      [
        { value: true, label: _t("Ascending") },
        { value: false, label: _t("Descending") },
      ]
    ),
  ],
  compute: function (
    range: MimicMatrix,
    n: Maybe<FunctionResultObject>,
    ...displayTiesMode_sortingCriteria: [Maybe<FunctionResultObject>, ...Array<Arg>]
  ): any {
    const _n = Math.min(toNumber(n?.value ?? 1, this.locale), range.height);

    const _displayTiesMode: number =
      displayTiesMode_sortingCriteria.length % 2 === 0
        ? 0
        : toNumber(displayTiesMode_sortingCriteria[0]?.value, this.locale);
    const sortingCriteria: Arg[] =
      displayTiesMode_sortingCriteria.length % 2 === 0
        ? displayTiesMode_sortingCriteria
        : displayTiesMode_sortingCriteria.slice(1);

    if (_n < 0) {
      return new EvaluationError(_t("Wrong value of 'n'. Expected a positive number. Got %s.", _n));
    }

    if (_displayTiesMode < 0 || _displayTiesMode > 3) {
      return new EvaluationError(
        _t(
          "Wrong value of 'display_ties_mode'. Expected a positive number between 0 and 3. Got %s.",
          _displayTiesMode
        )
      );
    }
    const sortedData = sortMatrix(range.transpose(), this.locale, ...sortingCriteria);
    const sameRows = (i: number, j: number) =>
      JSON.stringify(sortedData.getCol(i).flatten("rowFirst", (c) => c.value)) ===
      JSON.stringify(sortedData.getCol(j).flatten("rowFirst", (c) => c.value));
    /*
     * displayTiesMode determine how ties (equal values) are dealt with:
     * 0 - ignore ties and show first n rows only
     * 1 - show first n rows plus any additional ties with nth row
     * 2 - show n rows but remove duplicates
     * 3 - show first n unique rows and all duplicates of these rows
     */
    switch (_displayTiesMode) {
      case 0:
        return sortedData.sliceCols(0, _n).transpose();
      case 1:
        for (let i = _n; i < sortedData.width; i++) {
          if (!sameRows(i, _n - 1)) {
            return sortedData.sliceCols(0, i).transpose();
          }
        }
        return sortedData.transpose();
      case 2: {
        const uniqueIndex = [0];

        for (let i = 1; i < sortedData.width; i++) {
          for (let j = 0; j < i; j++) {
            if (sameRows(i, j)) {
              break;
            }
            if (j === i - 1) {
              uniqueIndex.push(i);
            }
          }
        }
        const reduceUniqueIndex = uniqueIndex.slice(0, _n);

        // TO DO: factorize this code by creating a function that takes as parameter the list of index to keep and return the corresponding mimic matrix
        // same for formula that return a mimic matrix based on row index
        return new MimicMatrix(reduceUniqueIndex.length, sortedData.height, (zone) => {
          const partialWidth = zone.right - zone.left + 1;
          const result = new Array(partialWidth);
          for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
            result[colIndex] = sortedData.getZone({
              top: zone.top,
              left: reduceUniqueIndex[zone.left + colIndex],
              bottom: zone.bottom,
              right: reduceUniqueIndex[zone.left + colIndex],
            })[0];
          }
          return result;
        }).transpose();
      }
      case 3: {
        const uniqueIndexes = [0];
        let counter = 1;
        for (let i = 1; i < sortedData.width; i++) {
          if (!sameRows(i, i - 1)) {
            counter++;
          }
          if (counter > _n) {
            break;
          }
          uniqueIndexes.push(i);
        }
        return new MimicMatrix(uniqueIndexes.length, sortedData.height, (zone) => {
          const partialWidth = zone.right - zone.left + 1;
          const result = new Array(partialWidth);
          for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
            result[colIndex] = sortedData.getZone({
              top: zone.top,
              left: uniqueIndexes[zone.left + colIndex],
              bottom: zone.bottom,
              right: uniqueIndexes[zone.left + colIndex],
            })[0];
          }
          return result;
        }).transpose();
      }
    }
  },
  isExported: false,
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
      _t("Whether to filter the data by columns or by rows."),
      [
        { value: true, label: _t("Return unique columns") },
        { value: false, label: _t("Return unique rows") },
      ]
    ),
    arg(
      "exactly_once (boolean, default=FALSE)",
      _t("Whether to return only entries with no duplicates."),
      [
        { value: true, label: _t("Return items that appear exactly once") },
        { value: false, label: _t("Return every distinct item") },
      ]
    ),
  ],
  compute: function (
    range: Arg,
    byColumn: Maybe<FunctionResultObject>,
    exactlyOnce: Maybe<FunctionResultObject>
  ) {
    let _range = toMimicMatrix(range);
    const _byColumn = toBoolean(byColumn?.value) || false;
    const _exactlyOnce = toBoolean(exactlyOnce?.value) || false;
    // TO DO: optimize this function to avoid transposing twice
    if (!_byColumn) {
      _range = _range.transpose();
    }

    const map: Map<string, { index: number; count: number }> = new Map();

    for (let i = 0; i < _range.width; i++) {
      const key = JSON.stringify(_range.getCol(i).flatten("rowFirst", (c) => c.value));
      const occurrence = map.get(key);
      if (!occurrence) {
        map.set(key, { index: i, count: 1 });
      } else {
        occurrence.count++;
      }
    }

    const uniqueIndexes: number[] = [];
    for (const row of map.values()) {
      if (_exactlyOnce && row.count > 1) {
        continue;
      }
      uniqueIndexes.push(row.index);
    }

    if (!uniqueIndexes.length) {
      return new EvaluationError(_t("No unique values found"));
    }

    const result = new MimicMatrix(uniqueIndexes.length, _range.height, (zone) => {
      const partialWidth = zone.right - zone.left + 1;
      const result = new Array(partialWidth);
      for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
        result[colIndex] = _range.getZone({
          top: zone.top,
          left: uniqueIndexes[zone.left + colIndex],
          bottom: zone.bottom,
          right: uniqueIndexes[zone.left + colIndex],
        })[0];
      }
      return result;
    });
    return _byColumn ? result : result.transpose();
  },
  isExported: true,
} satisfies AddFunctionDescription;
