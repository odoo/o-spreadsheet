import { CompiledFormula } from "../../formulas/compiler";
import { deepCopy, deepEquals } from "../../helpers";
import { toCartesian, toXC } from "../../helpers/coordinates";
import { getRangeString } from "../../helpers/range";
import { Cell } from "../../types/cells";
import { CoreGetters } from "../../types/core_getters";
import { UID } from "../../types/misc";
import { Range } from "../../types/range";

export interface SquishedFormula {
  N?: string; // the numbers used in the formula, ordered by position, converted to string, separated by |
  S?: string[]; // the strings used in the formula, ordered by position
  R?: string | string[]; // the references used in the formula, ordered by position, converted to string, separated by | if needed
}

export type SquishedCell = string | SquishedFormula;

export const SEPARATOR = "|";
export const NO_CHANGE = "=";

export class Squisher {
  private readonly getters: CoreGetters;
  // the base formula to compare against
  private baseFormula: CompiledFormula | undefined;
  // for each number in the base formula, how much offset has already been applied
  private alreadyAppliedNumberOffsets: number[] = [];
  // for each string in the base formula, the previous string value
  private previousStrings: string[] = [];
  // whether the base formula was already transformed. Formulas that have already been transformed must continue to be transformed
  private baseFormulaWasTransformed: boolean;

  constructor(getters: CoreGetters) {
    this.getters = getters;
    this.baseFormulaWasTransformed = false;
  }

  /** Build the result object based on a transformation. Joins the numbers into a single string, tries to do the same
   * with references (unless they contain a sheet name that contains the separator). */
  private buildResult(
    numbers: string[],
    strings: string[],
    references: string[]
  ): Partial<SquishedFormula> {
    const res: Partial<SquishedFormula> = {};
    if (numbers.length) {
      res.N = numbers.join(SEPARATOR);
    }
    if (strings.length) {
      res.S = strings;
    }
    if (references.length) {
      let referencePattern: string | string[] | null | undefined;
      if (references.some((x) => x.includes(SEPARATOR))) {
        referencePattern = references;
      } else {
        referencePattern = references.join(SEPARATOR);
      }
      res.R = referencePattern;
    }
    return res;
  }

  /** Change the base formula to the given one, resetting all offsets and previous strings */
  resetBaseTo(formula: CompiledFormula) {
    this.baseFormula = CompiledFormula.CopyWithDependenciesAndLiteral(
      formula,
      formula.sheetId,
      deepCopy(formula.rangeDependencies),
      formula.literalValues.numbers,
      formula.literalValues.strings
    );
    this.alreadyAppliedNumberOffsets = formula.literalValues.numbers.map((_) => 0);
    this.previousStrings = formula.literalValues.strings.map((x) => x.value);
    this.baseFormulaWasTransformed = false;
  }

  /** Reset the base formula to undefined, resetting all offsets */
  resetBase() {
    if (this.baseFormula) {
      this.baseFormula = undefined;
      this.alreadyAppliedNumberOffsets = [];
      this.previousStrings = [];
      this.baseFormulaWasTransformed = false;
    }
  }

  /**
   * Takes a cell and squish their formulas against the previous one (in the previous call).
   * We should call this method for each cell in the sheet, in order from top to bottom, then from left to right (all cells of a columns, for each columns left to right).
   *
   * The result of this method is:
   * - if the cell is not a formula, returns the content as is and resets the base formula
   * - if the cell is a formula:
   *   - if there is no previous formula, or the normalized formula is different from the previous one, resets the base formula to this one and returns the full formula string
   *   - else, compares the literal values and range dependencies to the previous formula, and for each parameter:
   *     - for numbers: returns a relative change (+N or -N) if possible, else the full number or "=" if unchanged
   *     - for strings: returns the full string if changed, else "="
   *     - for references: returns a relative change (+Ck or +Rk) if possible, else the full reference or "=" if unchanged
   * */
  squish(cell: Cell, forSheetId: UID): SquishedCell {
    if (!cell.isFormula) {
      this.resetBase();
      return cell.content;
    }

    let numbers: string[] = [];
    let strings: string[] = [];
    let references: string[] = [];

    if (
      !this.baseFormula ||
      this.baseFormula.normalizedFormula !== cell.compiledFormula.normalizedFormula
    ) {
      this.resetBaseTo(cell.compiledFormula);
      return cell.compiledFormula.toFormulaString(this.getters);
    } else {
      if (
        !this.baseFormulaWasTransformed &&
        deepEquals(cell.compiledFormula.literalValues, this.baseFormula.literalValues) &&
        deepEquals(cell.compiledFormula.rangeDependencies, this.baseFormula.rangeDependencies)
      ) {
        return cell.compiledFormula.toFormulaString(this.getters);
      }
      numbers = this.squishNumbers(cell.compiledFormula.literalValues.numbers);
      strings = this.squishStrings(cell.compiledFormula.literalValues.strings);
      references = this.squishReferences(cell.compiledFormula.rangeDependencies, forSheetId);
      this.baseFormulaWasTransformed = true;
    }
    return this.buildResult(numbers, strings, references);
  }

  /**
   * Read all the consecutive cells with either the same content or the same transformation and merge their key into one zone
   * Do not join cells from different columns
   * */
  squishSheet(cells: { [key: string]: string | SquishedCell }): {
    [key: string]: string | SquishedCell;
  } {
    const allKeys = Object.keys(cells);
    const result: { [key: string]: string | SquishedCell } = {};
    for (let i = 0; i < allKeys.length; i++) {
      const startKey = toCartesian(allKeys[i]);
      let offset = 0;
      for (let j = i + 1; j < allKeys.length; j++) {
        const nextKey = toCartesian(allKeys[j]);
        if (nextKey.col === startKey.col) {
          // same column, check if consecutive row
          if (
            nextKey.row === startKey.row + offset + 1 &&
            deepEquals(cells[allKeys[j]], cells[allKeys[i]])
          ) {
            // consecutive cell with same transformation or same value, continue
            offset += 1;
          } else {
            // not consecutive, break
            break;
          }
        } else {
          // different column, break
          break;
        }
      }
      if (offset > 0) {
        // we have found consecutive empty cells, merge them
        const rangeKey = `${allKeys[i]}:${toXC(startKey.col, startKey.row + offset)}`;
        result[rangeKey] = cells[allKeys[i]];
        i += offset;
      } else {
        result[allKeys[i]] = cells[allKeys[i]];
        offset = 0;
      }
    }

    return result;
  }

  /**
   * Squish the references. Result for each reference should be compared the previous formula.
   * The result can be:
   * - a relative change, e.g. +C2 or +R5 as string
   * - the full reference if the reference is too different
   * */
  private squishReferences(references: Range[], forSheetId: UID) {
    if (!this.baseFormula) {
      throw new Error("No previous cell to squish against");
    }
    return references.map((x, index) =>
      this.squishOneReference(x, this.baseFormula!.rangeDependencies, index, forSheetId)
    );
  }

  private squishOneReference(
    reference: Range,
    previousReferences: Range[],
    index: number,
    forSheetId: UID
  ) {
    const previousReference = previousReferences[index];
    if (deepEquals(previousReference, reference)) {
      return NO_CHANGE;
    }
    if (
      previousReference.sheetId !== reference.sheetId ||
      previousReference.prefixSheet !== reference.prefixSheet ||
      previousReference.invalidSheetName !== reference.invalidSheetName ||
      previousReference.invalidXc !== reference.invalidXc
    ) {
      // sheet changed or valid/invalid changed, cannot squish
      previousReferences[index] = deepCopy(reference);
      return getRangeString(reference, forSheetId, this.getters.getSheetName);
    }
    if (
      previousReference.unboundedZone.bottom === undefined ||
      previousReference.unboundedZone.right === undefined ||
      reference.unboundedZone.bottom === undefined ||
      reference.unboundedZone.right === undefined
    ) {
      // unbounded ranges, cannot squish
      previousReferences[index] = deepCopy(reference);
      return getRangeString(reference, forSheetId, this.getters.getSheetName);
    }
    for (let i = 0; i < reference.parts.length; i++) {
      if (
        previousReference.parts[i].colFixed !== reference.parts[i].colFixed ||
        previousReference.parts[i].rowFixed !== reference.parts[i].rowFixed
      ) {
        // absolute/relative parts changed, cannot squish
        previousReferences[index] = deepCopy(reference);
        return getRangeString(reference, forSheetId, this.getters.getSheetName);
      }
    }
    const currentZone = reference.zone;
    const previousZone = previousReference.zone;
    if (
      currentZone.top !== currentZone.bottom ||
      currentZone.left !== currentZone.right ||
      previousZone.top !== previousZone.bottom ||
      previousZone.left !== previousZone.right
    ) {
      // ranges, cannot squish
      previousReferences[index] = deepCopy(reference);
      return getRangeString(reference, forSheetId, this.getters.getSheetName);
    }

    if (
      currentZone.left === currentZone.right &&
      currentZone.top === currentZone.bottom &&
      previousZone.left === previousZone.right &&
      previousZone.top === previousZone.bottom
    ) {
      // 1D range squishing
      const diffCol = reference.zone.left - previousReference.zone.left;
      const diffRow = reference.zone.top - previousReference.zone.top;
      previousReference.zone = deepCopy(reference.zone);
      previousReference.unboundedZone = deepCopy(reference.unboundedZone);
      if (diffCol !== 0 && diffRow === 0) {
        return `${diffCol > 0 ? "+" : "-"}C${Math.abs(diffCol)}`; // ex. +C2 or -C3
      } else if (diffRow !== 0 && diffCol === 0) {
        return `${diffRow > 0 ? "+" : "-"}R${Math.abs(diffRow)}`; // ex. +R5 or -R4
      }
    }
    return getRangeString(reference, forSheetId, this.getters.getSheetName);
  }

  /**
   * Squish the number parameters. Result for each parameter should be compared the previous formula.
   * The result can be:
   * - a relative change, e.g. +2 or -5 as string
   * - "=" meaning no change as string
   * - the full number if the number is less than 100 or the change is big (more than 2 digits) as number
   * */
  private squishNumbers(numbers: { value: number }[]) {
    const result: string[] = numbers.map((x) => NO_CHANGE);
    for (let i = 0; i < numbers.length; i++) {
      const diff =
        numbers[i].value -
        (this.baseFormula!.literalValues.numbers[i].value + this.alreadyAppliedNumberOffsets[i] ||
          0);

      if (diff !== 0) {
        result[i] = "+" + diff.toString();
        this.alreadyAppliedNumberOffsets[i] = (this.alreadyAppliedNumberOffsets[i] || 0) + diff;
      }
    }
    return result;
  }

  private squishStrings(strings: { value: string }[]) {
    const result: string[] = strings.map((x) => NO_CHANGE);
    for (let i = 0; i < strings.length; i++) {
      const str = strings[i].value;
      const previousStr = this.previousStrings[i];
      if (str !== previousStr) {
        // different strings, cannot squish
        result[i] = str;
        this.previousStrings[i] = str;
      }
    }
    return result;
  }
}
