import { transpose2dArray } from "../helpers";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  isMatrix,
  MatrixFunctionReturn,
  PrimitiveArg,
} from "../types";
import { NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import { assert, matrixMap, toBoolean, toCellValue, toMatrix } from "./helpers";
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
  computeValueAndFormat: function (range: Arg, ...conditions: Arg[]) {
    let _array = toMatrix(range);
    const _conditionsMatrices = conditions.map((cond) =>
      matrixMap(toMatrix(cond), (data) => toCellValue(data.value))
    );
    _conditionsMatrices.map((c) =>
      assertSingleColOrRow(_t("The arguments condition must be a single column or row."), c)
    );
    assertSameDimensions(
      _t("The arguments conditions must have the same dimensions."),
      ..._conditionsMatrices
    );
    const _conditions = _conditionsMatrices.map((c) => c.flat());

    const mode = _conditionsMatrices[0].length === 1 ? "row" : "col";
    _array = mode === "row" ? transpose2dArray(_array) : _array;

    assert(
      () => _conditions.every((cond) => cond.length === _array.length),
      _t(`FILTER has mismatched sizes on the range and conditions.`)
    );

    const result: MatrixFunctionReturn = [];
    for (let i = 0; i < _array.length; i++) {
      const row = _array[i];
      if (_conditions.every((c) => c[i])) {
        result.push(
          row.map((cell) => ({
            value: toCellValue(cell.value),
            format: cell.format,
          }))
        );
      }
    }

    if (!result.length) {
      throw new NotAvailableError(_t("No match found in FILTER evaluation"));
    }

    return mode === "row" ? transpose2dArray(result) : result;
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
  computeValueAndFormat: function (range: Arg, byColumn: PrimitiveArg, exactlyOnce: PrimitiveArg) {
    if (!isMatrix(range)) {
      return { value: toCellValue(range.value), format: range.format };
    }
    const _byColumn = toBoolean(byColumn?.value) || false;
    const _exactlyOnce = toBoolean(exactlyOnce?.value) || false;
    let _array = toMatrix(range);
    if (!_byColumn) {
      _array = transpose2dArray(_array);
    }

    const map: Map<string, { data: PrimitiveArg[]; count: number }> = new Map();

    for (const data of _array) {
      const key = JSON.stringify(data.map((item) => item.value));
      const occurrence = map.get(key);
      if (!occurrence) {
        map.set(key, { data, count: 1 });
      } else {
        occurrence.count++;
      }
    }

    const result: MatrixFunctionReturn = [];
    for (const row of map.values()) {
      if (_exactlyOnce && row.count > 1) {
        continue;
      }
      result.push(
        row.data.map((item) => ({ value: toCellValue(item.value), format: item.format }))
      );
    }

    if (!result.length) throw new Error(_t("No unique values found"));

    return _byColumn ? result : transpose2dArray(result);
  },
  isExported: true,
} satisfies AddFunctionDescription;
