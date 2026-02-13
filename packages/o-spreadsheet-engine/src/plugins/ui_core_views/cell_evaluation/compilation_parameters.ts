import { functionRegistry } from "../../../functions/function_registry";
import { MimicMatrix } from "../../../functions/helper_arg";
import { isZoneValid } from "../../../helpers/zones";
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
  Zone,
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

  private mimicMatrixCache: Record<string, MimicMatrix> = {};

  constructor(
    context: ModelConfig["custom"],
    private getters: Getters,
    private computeCell: (position: CellPosition) => EvaluatedCell
  ) {
    this.evalContext = Object.assign(Object.create(functionMap), context, {
      getters: this.getters,
      locale: this.getters.getLocale(),
      getRef: this.getRef.bind(this),
      getRange: this.getRange.bind(this),
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

    if (this.evalContext?.__originCellPosition) {
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
  private range(range: Range): MimicMatrix {
    const sheetId = range.sheetId;
    const { top, left, bottom, right } = range.zone;
    const cacheKey = `${sheetId}-${top}-${left}-${bottom}-${right}`;

    if (cacheKey in this.mimicMatrixCache) {
      return this.mimicMatrixCache[cacheKey];
    }

    const rangeError = this.getRangeError(range);
    if (rangeError) {
      this.mimicMatrixCache[cacheKey] = new MimicMatrix(1, 1, () => [[rangeError]]);
      return this.mimicMatrixCache[cacheKey];
    }
    const height = bottom - top + 1;
    const width = right - left + 1;

    this.mimicMatrixCache[cacheKey] = new MimicMatrix(width, height, (zone: Zone) => {
      // Zone starts at 0,0 for the top left corner of the range, so we need to shift it by the top and left of the range to get the actual position in the sheet
      const realLeft = zone.left + left;
      const realTop = zone.top + top;
      const realRight = zone.right + left;
      const realBottom = zone.bottom + top;
      const realZone = { left: realLeft, top: realTop, right: realRight, bottom: realBottom };

      const range = this.getters.getRangeFromZone(sheetId, realZone);
      if (this.evalContext.__originCellPosition) {
        this.evalContext.currentFormulaDependencies?.push(range);
      }

      const partialWidth = zone.right - zone.left + 1;
      const partialHeight = zone.bottom - zone.top + 1;

      const elements: Matrix<FunctionResultObject> = new Array(partialWidth);
      for (let colIndex = 0; colIndex < partialWidth; colIndex++) {
        elements[colIndex] = new Array(partialHeight);
        for (let rowIndex = 0; rowIndex < partialHeight; rowIndex++) {
          const realCol = colIndex + realLeft;
          const realRow = rowIndex + realTop;
          const position = { sheetId: range.sheetId, col: realCol, row: realRow };

          const result = this.computeCell(position);
          if (!result.position) {
            elements[colIndex][rowIndex] = { ...result, position };
          } else {
            elements[colIndex][rowIndex] = result;
          }
        }
      }

      return elements;
    });
    return this.mimicMatrixCache[cacheKey];
  }

  private getRef(position: CellPosition): FunctionResultObject {
    const range = this.getters.getRangeFromZone(position.sheetId, {
      top: position.row,
      left: position.col,
      bottom: position.row,
      right: position.col,
    });

    return this.refFn(range);
  }

  private getRange(zone: Zone, sheetId: string): MimicMatrix {
    const range = this.getters.getRangeFromZone(sheetId, zone);
    return this.range(range);
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
