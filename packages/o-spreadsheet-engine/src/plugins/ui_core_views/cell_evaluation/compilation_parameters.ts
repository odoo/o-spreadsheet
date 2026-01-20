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
  private range(range: Range): MimicMatrix {
    const sheetId = range.sheetId;
    const { top, left, bottom, right } = range.zone;
    const cacheKey = `${sheetId}-${top}-${left}-${bottom}-${right}`;

    if (cacheKey in this.mimicMatrixCache) {
      return this.mimicMatrixCache[cacheKey];
    }

    const rangeError = this.getRangeError(range);
    if (rangeError) {
      this.mimicMatrixCache[cacheKey] = new MimicMatrix(1, 1, () => rangeError);
      return this.mimicMatrixCache[cacheKey];
    }
    const height = bottom - top + 1;
    const width = right - left + 1;

    // TO DO: voir dans le cas precis de la creation d'une MimicMatrix a partir d'une Range,
    // si on doit (et on sait) eviter de update currentFormulaDependencies un par un
    // lors de l'appel à getAll.
    this.mimicMatrixCache[cacheKey] = new MimicMatrix(width, height, (colIndex, rowIndex) => {
      const col = left + colIndex;
      const row = top + rowIndex;
      const position = { sheetId, col, row };
      return this.getRef(position);
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
