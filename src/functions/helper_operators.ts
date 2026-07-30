import { intersection } from "../helpers/zones";
import { _t } from "../translation";
import { InvalidReferenceError } from "../types/errors";
import { EvalContext } from "../types/functions";
import { FunctionResultObject } from "../types/misc";
import { expectReferenceError } from "./helpers";

export function evaluateRange(
  this: EvalContext,
  firstCell: FunctionResultObject,
  secondCell: FunctionResultObject
): FunctionResultObject | FunctionResultObject[][] | InvalidReferenceError {
  if (firstCell.position === undefined || secondCell.position === undefined) {
    return new InvalidReferenceError(expectReferenceError);
  }

  if (firstCell.position.sheetId !== secondCell.position.sheetId) {
    return new InvalidReferenceError(
      _t("The two references must be in the same sheet to get the range between them.")
    );
  }

  const sheetId = firstCell.position.sheetId;
  const zone = {
    top: Math.min(firstCell.position.row, secondCell.position.row),
    left: Math.min(firstCell.position.col, secondCell.position.col),
    bottom: Math.max(firstCell.position.row, secondCell.position.row),
    right: Math.max(firstCell.position.col, secondCell.position.col),
  };

  // #########################################################################
  // ########################   should be here ?? ############################
  const originPosition = this.__originCellPosition;
  if (originPosition) {
    // The following line is used to reset the dependencies of the cell, to avoid
    // keeping dependencies from previous evaluation (i.e. in case the reference
    // has been changed).
    this.updateDependencies?.(originPosition);
  }
  // ##############################   end   ##################################
  // #########################################################################

  // Performance issue: Avoid fetching data on positions that are out of the spreadsheet
  // e.g. A1:ZZZ9999 in a sheet with 10 cols and 10 rows should ignore everything past J10 and return a 10x10 array
  const sheetZone = this.getters.getSheetZone(sheetId);
  const _zone = intersection(zone, sheetZone);
  if (!_zone) {
    return [[]];
  }

  // #########################################################################
  // ########################   should be here ?? ############################
  const range = this.getters.getRangeFromZone(this.__originSheetId, _zone);
  if (originPosition) {
    this.addDependencies?.(originPosition, [range]);
  }
  // ##############################   end   ##################################
  // #########################################################################

  const { top, left, bottom, right } = zone;
  const cacheKey = `${sheetId}-${top}-${left}-${bottom}-${right}`;
  if (this.rangeCache && cacheKey in this.rangeCache) {
    return this.rangeCache[cacheKey];
  }

  const height = _zone.bottom - _zone.top + 1;
  const width = _zone.right - _zone.left + 1;
  const matrix = new Array(width);

  // Performance issue: nested loop is faster than a map here
  for (let col = _zone.left; col <= _zone.right; col++) {
    const colIndex = col - _zone.left;
    matrix[colIndex] = new Array(height);
    for (let row = _zone.top; row <= _zone.bottom; row++) {
      const rowIndex = row - _zone.top;
      matrix[colIndex][rowIndex] = this.getFormulaResult({ sheetId, col, row });
    }
  }

  if (this.rangeCache) {
    this.rangeCache[cacheKey] = matrix;
  }
  return matrix;
}
