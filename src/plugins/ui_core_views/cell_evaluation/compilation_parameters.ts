import { hasOppositeSigns } from "../../../functions/helpers";
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
  UnboundedZone,
} from "../../../types/misc";
import { ModelConfig } from "../../../types/model";
import { Range } from "../../../types/range";

export type CompilationParameters = {
  referenceDenormalizer: ReferenceDenormalizer;
  ensureRange: EnsureRange;
  evalContext: EvalContext;
};

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
    this.evalContext = Object.assign({}, context, {
      getters: this.getters,
      locale: this.getters.getLocale(),
      getFormulaResult: this.getFormulaResult.bind(this),
      __originSheetId: "",
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
  private range(zone: UnboundedZone, range: Range): Matrix<FunctionResultObject> {
    const rangeError = this.getRangeError(range);
    if (rangeError) {
      return [[rangeError]];
    }
    const sheetId = range.sheetId;

    // Performance issue: Avoid fetching data on positions that are out of the spreadsheet
    // e.g. A1:ZZZ9999 in a sheet with 10 cols and 10 rows should ignore everything past J10 and return a 10x10 array
    const sheetZone = this.getters.getSheetZone(sheetId);
    const existingRangeZone = intersection(range.zone, sheetZone);
    if (!existingRangeZone) {
      return [[]];
    }

    // zone index could be negative, meaning that we want to fetch cells in the existing range in the inverse order.
    // we can do this exercise because, at this step, we know the dimensions of the existing range.

    // example with the following range: A1:D1:
    // --> zone = { left: 0, top: 0, right: 0, bottom: 0 } means we want to fetch the sub-range (A1)
    // --> zone = { left: 0, top: 0, right: 3, bottom: 0 } means we want to fetch the sub-range (A1:C1)
    // --> zone = { left: 2, top: 0, right: 4, bottom: 0 } means we want to fetch the sub-range (C1:D1)
    // --> zone = { left: -1, top: 0, right: -1, bottom: 0 } means we want to fetch the sub-range (D1)
    // --> zone = { left: -2, top: 0, right: -1, bottom: 0 } means we want to fetch the sub-range (C1:D1)

    const totalWidth = existingRangeZone.right - existingRangeZone.left + 1;
    const totalHeight = existingRangeZone.bottom - existingRangeZone.top + 1;

    const left = zone.left;
    const right = zone.right === undefined ? Math.max(left, totalWidth - 1) : zone.right;
    const top = zone.top;
    const bottom = zone.bottom === undefined ? Math.max(top, totalHeight - 1) : zone.bottom;

    if (hasOppositeSigns(left, right) || hasOppositeSigns(top, bottom)) {
      throw new Error("Currently, we do not support this kind of zone");
      // TODO ?
      // --> zone = { left: -1, top: 0, right: 1, bottom: 0 } means we want to fetch the sub-range (D1 followed by A1:B1)
    }

    if (left > right || top > bottom) {
      throw new Error("Currently, we do not support this kind of zone");
    }

    // at this step we want to transform the zone coordinates into the absolute coordinates of the sheet.
    // it's at this step that we must transform negative coordinates into positive coordinates too

    const absLeft = left >= 0 ? existingRangeZone.left + left : existingRangeZone.right + left + 1;
    const absTop = top >= 0 ? existingRangeZone.top + top : existingRangeZone.bottom + top + 1;
    const absRight =
      right >= 0 ? existingRangeZone.left + right : existingRangeZone.right + right + 1;
    const absBottom =
      bottom >= 0 ? existingRangeZone.top + bottom : existingRangeZone.bottom + bottom + 1;

    // if absolute zone is not include or partially include in the existing range,
    // we return an empty array or an array partially filled.
    // We don't throw/return an error because functionally it depends on the function
    // that is using the range. (e.g. ARRAY.CONSTRAIN must receive less values than
    // the range passed to it.)

    // However, we don't return exactly an empty matrix but a matrix with undefined
    // values. Functionally we need information to know how many columns/rows are
    // empty. E.g. formula like CHOOSECOLUMNS need to distinguish between a range
    // that return empty because the index is out of range and return empty because
    // the zone.top/bottom is outside the range.

    // Example if we ask for a zone {left: 2, right: 4, top: 0, bottom: 1} in a
    // range {A1:B2}, the top and bottom are valid but the left and right are outside
    // the range.

    // if (
    //   absLeft < 0 ||
    //   existingRangeZone.right < absLeft ||
    //   absTop < 0 ||
    //   existingRangeZone.top > absTop
    // ) {
    //   // no need to check absRight and absBottom because they are always bigger
    //   // than absLeft and absTop due to the previous checks:
    //   // if(zone.left > zone.right || zone.top > zone.bottom)
    //   return [[]];
    // }

    // if zone is included partially in the existing range, we return the intersection of the two zones
    // if (absRight > existingRangeZone.right) {
    //   absRight = existingRangeZone.right;
    // }
    // if (absBottom > existingRangeZone.bottom) {
    //   absBottom = existingRangeZone.bottom;
    // }

    const cacheKey = `${sheetId}-${absLeft}-${absTop}-${absRight}-${absBottom}`;
    if (cacheKey in this.rangeCache) {
      return this.rangeCache[cacheKey];
    }

    const matrix: Matrix<FunctionResultObject> = new Array(absRight - absLeft + 1);
    // Performance issue: nested loop is faster than a map here
    for (let col = absLeft; col <= absRight; col++) {
      if (col > existingRangeZone.right || col < existingRangeZone.left) {
        continue;
      }

      const colIndex = col - absLeft;
      matrix[colIndex] = new Array(absBottom - absTop + 1);
      for (let row = absTop; row <= absBottom; row++) {
        if (row > existingRangeZone.bottom || row < existingRangeZone.top) {
          continue;
        }

        const rowIndex = row - absTop;
        const position = { sheetId, col, row };
        const result = this.computeCell(position);
        matrix[colIndex][rowIndex] = result.position ? result : { ...result, position };
      }
    }

    this.rangeCache[cacheKey] = matrix;
    return matrix;
  }

  private getFormulaResult(position: CellPosition): FunctionResultObject {
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
