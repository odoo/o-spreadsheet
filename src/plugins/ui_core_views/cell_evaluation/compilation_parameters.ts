import { functionRegistry } from "../../../functions";
import { intersection, isZoneValid, zoneToXc } from "../../../helpers";
import { ModelConfig } from "../../../model";
import { _lt } from "../../../translation";
import {
  CellPosition,
  CellValue,
  CellValueType,
  EnsureRange,
  EvalContext,
  EvaluatedCell,
  Format,
  Getters,
  Matrix,
  MatrixArg,
  PrimitiveArg,
  Range,
  ReferenceDenormalizer,
} from "../../../types";
import { EvaluationError, InvalidReferenceError } from "../../../types/errors";

export type CompilationParameters = [ReferenceDenormalizer, EnsureRange, EvalContext];
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
) {
  const builder = new CompilationParametersBuilder(context, getters, computeCell);
  return builder.getParameters();
}

class CompilationParametersBuilder {
  evalContext: EvalContext;

  private rangeCache: Record<string, MatrixArg | EvaluationError> = {};

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
    return [this.refFn.bind(this), this.range.bind(this), this.evalContext];
  }

  /**
   * Returns the value of the cell(s) used in reference
   *
   * @param range the references used
   * @param isMeta if a reference is supposed to be used in a `meta` parameter as described in the
   *        function for which this parameter is used, we just return the string of the parameter.
   *        The `compute` of the formula's function must process it completely
   */
  private refFn(
    range: Range,
    isMeta: boolean,
    functionName: string,
    paramNumber?: number
  ): PrimitiveArg {
    this.assertRangeValid(range);
    if (isMeta) {
      // Use zoneToXc of zone instead of getRangeString to avoid sending unbounded ranges
      return { value: zoneToXc(range.zone) };
    }

    // if the formula definition could have accepted a range, we would pass through the _range function and not here
    if (range.zone.bottom !== range.zone.top || range.zone.left !== range.zone.right) {
      throw new Error(
        paramNumber
          ? _lt(
              "Function %s expects the parameter %s to be a single value or a single cell reference, not a range.",
              functionName.toString(),
              paramNumber.toString()
            )
          : _lt(
              "Function %s expects its parameters to be single values or single cell references, not ranges.",
              functionName.toString()
            )
      );
    }

    return this.readCell(range);
  }

  private readCell(range: Range): PrimitiveArg {
    if (!this.getters.tryGetSheet(range.sheetId)) {
      throw new Error(_lt("Invalid sheet name"));
    }
    const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
    const evaluatedCell = this.getEvaluatedCellIfNotEmpty(position);
    if (evaluatedCell === undefined) {
      return { value: null, format: this.getters.getCell(position)?.format };
    }
    if (evaluatedCell.type === CellValueType.error) {
      throw evaluatedCell.error;
    }
    return evaluatedCell;
  }

  private getEvaluatedCellIfNotEmpty(position: CellPosition): EvaluatedCell | undefined {
    const evaluatedCell = this.computeCell(position);
    if (evaluatedCell.type === CellValueType.empty) {
      const cell = this.getters.getCell(position);
      if (!cell || (!cell.isFormula && cell.content === "")) {
        return undefined;
      }
    }
    return evaluatedCell;
  }

  /**
   * Return the values of the cell(s) used in reference, but always in the format of a range even
   * if a single cell is referenced. It is a list of col values. This is useful for the formulas that describe parameters as
   * range<number> etc.
   *
   * Note that each col is possibly sparse: it only contain the values of cells
   * that are actually present in the grid.
   */
  private range(range: Range): MatrixArg {
    this.assertRangeValid(range);
    const sheetId = range.sheetId;
    const zone = range.zone;

    // Performance issue: Avoid fetching data on positions that are out of the spreadsheet
    // e.g. A1:ZZZ9999 in a sheet with 10 cols and 10 rows should ignore everything past J10 and return a 10x10 array
    const sheetZone = this.getters.getSheetZone(sheetId);
    const _zone = intersection(zone, sheetZone);
    if (!_zone) {
      return { value: [[]], format: [[]] };
    }
    const { top, left, bottom, right } = zone;
    const cacheKey = `${sheetId}-${top}-${left}-${bottom}-${right}`;
    if (cacheKey in this.rangeCache) {
      const result = this.rangeCache[cacheKey];
      if (result instanceof EvaluationError) {
        throw result;
      }
      return result;
    }

    const height = _zone.bottom - _zone.top + 1;
    const width = _zone.right - _zone.left + 1;
    const value: Matrix<CellValue | undefined> = new Array(width);
    const format: Matrix<Format> = new Array(width);

    // Performance issue: nested loop is faster than a map here
    for (let col = _zone.left; col <= _zone.right; col++) {
      const colIndex = col - _zone.left;
      value[colIndex] = new Array(height);
      format[colIndex] = new Array(height);
      for (let row = _zone.top; row <= _zone.bottom; row++) {
        const evaluatedCell = this.getEvaluatedCellIfNotEmpty({ sheetId, col, row });
        if (evaluatedCell?.type === CellValueType.error) {
          this.rangeCache[cacheKey] = evaluatedCell.error;
          throw evaluatedCell.error;
        }
        const rowIndex = row - _zone.top;
        value[colIndex][rowIndex] = evaluatedCell?.value;
        if (evaluatedCell?.format !== undefined) {
          format[colIndex][rowIndex] = evaluatedCell.format;
        }
      }
    }
    const result = { value, format };
    this.rangeCache[cacheKey] = result;
    return result;
  }

  private assertRangeValid(range: Range): void {
    if (!isZoneValid(range.zone)) {
      throw new InvalidReferenceError();
    }
    if (range.invalidSheetName) {
      throw new Error(_lt("Invalid sheet name: %s", range.invalidSheetName));
    }
  }
}
