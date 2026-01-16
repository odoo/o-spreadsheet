import { functionRegistry } from "../../../functions/function_registry";
import { intersection, isZoneValid } from "../../../helpers/zones";
import { _t } from "../../../translation";
import { EvaluatedCell } from "../../../types/cells";
import { EvaluationError, InvalidReferenceError } from "../../../types/errors";
import { EvalContext } from "../../../types/functions";
import { Getters } from "../../../types/getters";
import {
  CellPosition,
  EnsureRange,
  FunctionResultObject,
  Matrix,
  ReferenceDenormalizer,
} from "../../../types/misc";
import { ModelConfig } from "../../../types/model";
import { Range } from "../../../types/range";

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

  constructor(
    context: ModelConfig["custom"],
    private getters: Getters,
    private computeCell: (position: CellPosition) => EvaluatedCell
  ) {
    this.evalContext = Object.assign(Object.create(functionMap), context, {
      getters: this.getters,
      locale: this.getters.getLocale(),
      getRef: this.getRef.bind(this),
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
   */
  private refFn(range: Range): FunctionResultObject {
    const rangeError = this.getRangeError(range);
    if (rangeError) {
      return rangeError;
    }

    if (this.evalContext.__originCellPosition) {
      this.evalContext.currentFormulaDependencies?.push(range);
    }
    // the compiler guarantees only single cell ranges reach this part of the code
    const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
    const result = this.computeCell(position);
    if (!result.position) {
      return { ...result, position };
    }
    return result;
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

    const height = _zone.bottom - _zone.top + 1;
    const width = _zone.right - _zone.left + 1;
    const matrix: Matrix<FunctionResultObject> = new Array(width);

    // Performance issue: nested loop is faster than a map here
    for (let col = _zone.left; col <= _zone.right; col++) {
      const colIndex = col - _zone.left;
      matrix[colIndex] = new Array(height);
      for (let row = _zone.top; row <= _zone.bottom; row++) {
        const rowIndex = row - _zone.top;
        const position = { sheetId, col, row };
        matrix[colIndex][rowIndex] = this.getRef(position);
      }
    }

    return matrix;
  }

  private getRef(position: CellPosition): FunctionResultObject {
    const range = this.getters.getRangeFromZone(position.sheetId, {
      top: position.row,
      left: position.col,
      bottom: position.row,
      right: position.col,
    });

    const rangeError = this.getRangeError(range);
    if (rangeError) {
      return rangeError;
    }
    if (this.evalContext.__originCellPosition) {
      // Sometimes, formulas does not return simple values, but also position information.
      // Mean that the formula result (or sub-formula result) is a reference to
      // another cell. (ex: XLOOKUP function).
      // However, in some cases, the position information is computed directly in
      // the formula (upstream of getRef) and is not directly deduced from the dependencies
      // of the formula. (ex: INDIRECT function).
      // In this case, we need to make sure that the dependencies of the formula
      // will be correctly updated to include the cell referenced by the position
      // information. This is why we push the range here:
      this.evalContext.currentFormulaDependencies?.push(range);
    }

    const result = this.computeCell(position);
    if (!result.position) {
      return { ...result, position };
    }
    return result;
  }

  private getRangeError(range: Range): EvaluationError | undefined {
    if (!isZoneValid(range.zone)) {
      return new InvalidReferenceError();
    }
    if (range.invalidSheetName) {
      return new InvalidReferenceError(_t("Invalid sheet name: %s", range.invalidSheetName));
    }
    return undefined;
  }
}
