import { functionRegistry } from "../../../functions";
import { getFullReference, intersection, isZoneValid, zoneToXc } from "../../../helpers";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import {
  CellPosition,
  EnsureRange,
  EvalContext,
  EvaluatedCell,
  FunctionResultObject,
  Getters,
  Matrix,
  Range,
  ReferenceDenormalizer,
} from "../../../types";
import { EvaluationError, InvalidReferenceError } from "../../../types/errors";

export type CompilationParameters = {
  referenceDenormalizer: ReferenceDenormalizer;
  ensureRange: EnsureRange;
  evalContext: EvalContext;
};
const functionMap = functionRegistry.mapping;

/**
 * Return all functions necessary to properly evaluate a formula:
 * - a refFn function to read any reference, cell or range of a normalized formula
 * - a range function to convert any reference to a proper value array
 * - an evaluation context
 */
export function buildCompilationParameters(
  context: ModelConfig["custom"],
  getters: Getters,
  computeCell: (position: CellPosition) => EvaluatedCell
): CompilationParameters {
  const builder = new CompilationParametersBuilder(context, getters, computeCell);
  return builder.getParameters();
}

class CompilationParametersBuilder {
  evalContext: EvalContext;

  private rangeCache: Record<string, Matrix<FunctionResultObject>> = {};

  constructor(
    context: ModelConfig["custom"],
    private getters: Getters,
    private computeCell: (position: CellPosition) => EvaluatedCell
  ) {
    this.evalContext = Object.assign(Object.create(functionMap), context, {
      getters: this.getters,
      locale: this.getters.getLocale(),
    });
  }

  getParameters(): CompilationParameters {
    return {
      referenceDenormalizer: this.refFn.bind(this),
      ensureRange: this.range.bind(this),
      evalContext: this.evalContext,
    };
  }

  /**
   * Returns the value of the cell(s) used in reference
   *
   * @param range the references used
   * @param isMeta if a reference is supposed to be used in a `meta` parameter as described in the
   *        function for which this parameter is used, we just return the string of the parameter.
   *        The `compute` of the formula's function must process it completely
   */
  private refFn(range: Range, isMeta: boolean): FunctionResultObject {
    const rangeError = this.getRangeError(range);
    if (rangeError) {
      return rangeError;
    }
    if (isMeta) {
      // Use zoneToXc of zone instead of getRangeString to avoid sending unbounded ranges
      const sheetName = this.getters.getSheetName(range.sheetId);
      return { value: getFullReference(sheetName, zoneToXc(range.zone)) };
    }
    // the compiler guarantees only single cell ranges reach this part of the code
    const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
    return this.computeCell(position);
  }

  /**
   * Return the values of the cell(s) used in reference, but always in the format of a range even
   * if a single cell is referenced. It is a list of col values. This is useful for the formulas that describe parameters as
   * range<number> etc.
   *
   * Note that each col is possibly sparse: it only contain the values of cells
   * that are actually present in the grid.
   */
  private range(range: Range): Matrix<FunctionResultObject> {
    const rangeError = this.getRangeError(range);
    if (rangeError) {
      return [[rangeError]];
    }
    const sheetId = range.sheetId;
    const zone = range.zone;

    // Performance issue: Avoid fetching data on positions that are out of the spreadsheet
    // e.g. A1:ZZZ9999 in a sheet with 10 cols and 10 rows should ignore everything past J10 and return a 10x10 array
    const sheetZone = this.getters.getSheetZone(sheetId);
    const _zone = intersection(zone, sheetZone);
    if (!_zone) {
      return [[]];
    }
    const { top, left, bottom, right } = zone;
    const cacheKey = `${sheetId}-${top}-${left}-${bottom}-${right}`;
    if (cacheKey in this.rangeCache) {
      return this.rangeCache[cacheKey];
    }

    const height = _zone.bottom - _zone.top + 1;
    const width = _zone.right - _zone.left + 1;
    const matrix: Matrix<FunctionResultObject> = new Array(width);
    // Performance issue: nested loop is faster than a map here
    for (let col = _zone.left; col <= _zone.right; col++) {
      const colIndex = col - _zone.left;
      matrix[colIndex] = new Array(height);
      for (let row = _zone.top; row <= _zone.bottom; row++) {
        const rowIndex = row - _zone.top;
        matrix[colIndex][rowIndex] = this.computeCell({ sheetId, col, row });
      }
    }

    this.rangeCache[cacheKey] = matrix;
    return matrix;
  }

  private getRangeError(range: Range): EvaluationError | undefined {
    if (!isZoneValid(range.zone)) {
      return new InvalidReferenceError();
    }
    if (range.invalidSheetName) {
      return new EvaluationError(_t("Invalid sheet name: %s", range.invalidSheetName));
    }
    return undefined;
  }
}
