import { functionRegistry } from "../../../functions";
import { getFullReference, intersection, isZoneValid, zoneToXc } from "../../../helpers";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import {
  CellPosition,
  EnsureRange,
  EvalContext,
  EvaluatedCell,
  FPayload,
  Getters,
  Matrix,
  Range,
} from "../../../types";
import { EvaluationError, InvalidReferenceError } from "../../../types/errors";

export type CompilationParameters = {
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

  private rangeCache: Record<string, Matrix<FPayload>> = {};

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
      ensureRange: this.range.bind(this),
      evalContext: this.evalContext,
    };
  }

  /**
   * Return the values of the cell(s) used in reference. It is a list of col values.
   *
   * Note that each col is possibly sparse: it only contain the values of cells
   * that are actually present in the grid.
   *
   * @param range the references used
   * @param isMeta if a reference is supposed to be used in a `meta` parameter as described in the
   *        function for which this parameter is used, we just return the string of the parameter.
   *        The `compute` of the formula's function must process it completely
   */
  private range(range: Range, isMeta: boolean): Matrix<FPayload> {
    if (!isZoneValid(range.zone)) {
      return [[new InvalidReferenceError()]];
    }
    if (range.invalidSheetName) {
      return [[new EvaluationError(_t("Invalid sheet name: %s", range.invalidSheetName))]];
    }

    if (isMeta) {
      // Use zoneToXc of zone instead of getRangeString to avoid sending unbounded ranges
      const sheetName = this.getters.getSheetName(range.sheetId);
      return [[{ value: getFullReference(sheetName, zoneToXc(range.zone)) }]];
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
    const matrix: Matrix<FPayload> = new Array(width);
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
}
