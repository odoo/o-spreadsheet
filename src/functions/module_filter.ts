import { transpose2dArray } from "../helpers";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  ArgValue,
  CellValue,
  isMatrix,
  Matrix,
  MatrixArgValue,
  PrimitiveArgValue,
} from "../types";
import { NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import { assert, toBoolean, toCellValue, toCellValueMatrix, toMatrixArgValue } from "./helpers";
import { assertSameDimensions, assertSingleColOrRow } from "./helper_assert";

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
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  compute: function (range: ArgValue, ...conditions: ArgValue[]): Matrix<CellValue> {
    let _range = toMatrixArgValue(range);
    const _conditionsMatrices = conditions.map((cond) => toMatrixArgValue(cond));
    _conditionsMatrices.map((c) =>
      assertSingleColOrRow(_t("The arguments condition must be a single column or row."), c)
    );
    assertSameDimensions(
      _t("The arguments conditions must have the same dimensions."),
      ..._conditionsMatrices
    );
    const _conditions = _conditionsMatrices.map((c) => c.flat());

    const mode = _conditionsMatrices[0].length === 1 ? "row" : "col";
    _range = mode === "row" ? transpose2dArray(_range) : _range;

    assert(
      () => _conditions.every((cond) => cond.length === _range.length),
      _t(`FILTER has mismatched sizes on the range and conditions.`)
    );

    const results: MatrixArgValue = [];

    for (let i = 0; i < _range.length; i++) {
      const row = _range[i];
      if (_conditions.every((c) => c[i])) {
        results.push(row);
      }
    }

    if (!results.length) {
      throw new NotAvailableError(_t("No match found in FILTER evaluation"));
    }

    return toCellValueMatrix(mode === "row" ? transpose2dArray(results) : results);
  },
  isExported: true,
} satisfies AddFunctionDescription;

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
  returns: ["RANGE<NUMBER>"],
  // TODO computeFormat
  compute: function (
    range: ArgValue,
    byColumn: PrimitiveArgValue,
    exactlyOnce: PrimitiveArgValue
  ): Matrix<CellValue> | CellValue {
    if (!isMatrix(range)) {
      return toCellValue(range);
    }
    const _byColumn = toBoolean(byColumn) || false;
    const _exactlyOnce = toBoolean(exactlyOnce) || false;
    if (!_byColumn) range = transpose2dArray(range);

    const map: Map<string, { val: (CellValue | undefined)[]; count: number }> = new Map();

    for (const row of range) {
      const key = JSON.stringify(row);
      const occurrence = map.get(key);
      if (!occurrence) {
        map.set(key, { val: row, count: 1 });
      } else {
        occurrence.count++;
      }
    }

    const results = _exactlyOnce
      ? [...map.values()].filter((v) => v.count === 1).map((v) => v.val)
      : [...map.values()].map((v) => v.val);

    if (!results.length) throw new Error(_t("No unique values found"));

    return toCellValueMatrix(_byColumn ? results : transpose2dArray(results));
  },
  isExported: true,
} satisfies AddFunctionDescription;
