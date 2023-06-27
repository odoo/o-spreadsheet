import { transpose2dArray } from "../helpers";
import { _lt } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  CellValue,
  Format,
  isMatrix,
  MatrixArgValue,
  PrimitiveArg,
  PrimitiveFormat,
} from "../types";
import { NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import {
  assert,
  toBoolean,
  toCellValue,
  toCellValueMatrix,
  toMatrix,
  toMatrixArgValue,
} from "./helpers";
import { assertSameDimensions, assertSingleColOrRow } from "./helper_assert";

// -----------------------------------------------------------------------------
// FILTER
// -----------------------------------------------------------------------------
export const FILTER: AddFunctionDescription = {
  description: _lt(
    "Returns a filtered version of the source range, returning only rows or columns that meet the specified conditions."
  ),
  // TODO modify args description when vectorization on formulas is available
  args: [
    arg("range (any, range<any>)", _lt("The data to be filtered.")),
    arg(
      "condition1 (boolean, range<boolean>)",
      _lt(
        "A column or row containing true or false values corresponding to the first column or row of range."
      )
    ),
    arg(
      "condition2 (boolean, range<boolean>, repeating)",
      _lt("Additional column or row containing true or false values.")
    ),
  ],
  returns: ["RANGE<ANY>"],
  //TODO computeFormat
  computeValueAndFormat: function (range: Arg, ...conditions: Arg[]) {
    let _values = toMatrixArgValue(range.value);
    let _formats = toMatrix(range.format);
    const _conditionsMatrices = conditions.map((cond) => toMatrixArgValue(cond.value));
    _conditionsMatrices.map((c) =>
      assertSingleColOrRow(_lt("The arguments condition must be a single column or row."), c)
    );
    assertSameDimensions(
      _lt("The arguments conditions must have the same dimensions."),
      ..._conditionsMatrices
    );
    const _conditions = _conditionsMatrices.map((c) => c.flat());

    const mode = _conditionsMatrices[0].length === 1 ? "row" : "col";
    _values = mode === "row" ? transpose2dArray(_values) : _values;
    _formats = mode === "row" ? transpose2dArray(_formats) : _formats;

    assert(
      () => _conditions.every((cond) => cond.length === _values.length),
      _lt(`FILTER has mismatched sizes on the range and conditions.`)
    );

    const values: MatrixArgValue = [];
    const formats: (Format | undefined)[][] = [];
    for (let i = 0; i < _values.length; i++) {
      const row = _values[i];
      if (_conditions.every((c) => c[i])) {
        values.push(row);
        formats.push(_formats[i]);
      }
    }

    if (!values.length) {
      throw new NotAvailableError(_lt("No match found in FILTER evaluation"));
    }

    return {
      value: toCellValueMatrix(mode === "row" ? transpose2dArray(values) : values),
      format: mode === "row" ? transpose2dArray(formats) : formats,
    };
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// UNIQUE
// -----------------------------------------------------------------------------
export const UNIQUE: AddFunctionDescription = {
  description: _lt("Unique rows in the provided source range."),
  args: [
    arg("range (any, range<any>)", _lt("The data to filter by unique entries.")),
    arg(
      "by_column (boolean, default=FALSE)",
      _lt("Whether to filter the data by columns or by rows.")
    ),
    arg(
      "exactly_once (boolean, default=FALSE)",
      _lt("Whether to return only entries with no duplicates.")
    ),
  ],
  returns: ["RANGE<NUMBER>"],
  computeValueAndFormat: function (range: Arg, byColumn: PrimitiveArg, exactlyOnce: PrimitiveArg) {
    if (!isMatrix(range.value)) {
      return { value: toCellValue(range.value), format: range.format as PrimitiveFormat };
    }
    const _byColumn = toBoolean(byColumn?.value) || false;
    const _exactlyOnce = toBoolean(exactlyOnce?.value) || false;
    const _values = _byColumn ? range.value : transpose2dArray(range.value);
    const _formats = _byColumn ? toMatrix(range.format) : transpose2dArray(toMatrix(range.format));

    const map: Map<
      string,
      { val: (CellValue | undefined)[]; fmt: (string | undefined)[]; count: number }
    > = new Map();

    for (let row = 0; row < _values.length; row++) {
      const format = _formats?.[row] ? _formats[row] : Array(_values[row].length).fill(undefined);
      const data = _values[row].map((v, i) => ({ value: v, format: format[i] }));
      const key = JSON.stringify(data);
      const occurrence = map.get(key);
      if (!occurrence) {
        map.set(key, { val: _values[row].map(toCellValue), fmt: format, count: 1 });
      } else {
        occurrence.count++;
      }
    }

    const values: (CellValue | undefined)[][] = [];
    const formats: (Format | undefined)[][] = [];
    for (const result of map.values()) {
      if (_exactlyOnce && result.count > 1) {
        continue;
      }
      values.push(result.val);
      formats.push(result.fmt);
    }

    if (!values.length) throw new Error(_lt("No unique values found"));

    return { value: toCellValueMatrix(_byColumn ? values : transpose2dArray(values)) };
  },
  isExported: true,
};
