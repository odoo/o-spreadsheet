import { CompiledFormula } from "../../formulas/compiler";
import { deepCopy, deepEquals } from "../../helpers";
import { createCell, createLiteralCell } from "../../helpers/cells/cell_evaluation";
import { toCartesian, toXC } from "../../helpers/coordinates";
import { getRangeString } from "../../helpers/range";
import { Cell } from "../../types/cells";
import { UpdateCellCommand } from "../../types/commands";
import { CoreGetters } from "../../types/core_getters";
import { Format } from "../../types/format";
import { UID } from "../../types/misc";
import { Range } from "../../types/range";

/**
 * Example of squishing:
 * "=concat(A1, "test", B1:C3, 5)" followed by
 * "=concat(A2, "test", B1:C3, 7)"
 *        __|      |_     |    |
 *       |    _______|____|    |
 *       v   v       v         v
 * {R: "+R1|=", S: ["="], N: "+2"}
 *
 * N can be full numbers or relative change identified with a + sign before the number.
 * R can be full references or relative change identified with a +Ck or +Rk (k being the number of columns or rows of the change).
 * S can only be the full string if it changed, or "=" if it did not change.
 * * */
export interface SquishedFormula {
  N?: string; // the numbers used in the formula, ordered by position, converted to string, separated by |
  S?: string[]; // the strings used in the formula, ordered by position
  R?: string | string[]; // the references used in the formula, ordered by position, converted to string, separated by | if needed
}

export type SquishedContent = string | SquishedFormula;

export const SEPARATOR = "|";
export const NO_CHANGE = "=";

/**
 * Parse a content which could be squished as a relative number change (e.g. { N: "+1" }).
 *
 * Both the squisher and the unsquisher must agree on the result: the unsquisher only
 * knows the content it receives, it infers the number and its format from it. The
 * squisher must therefore look at the very same thing, and not at the format of the
 * cell: they differ when the format is transported aside from the content (the format
 * of an UPDATE_CELL command, or the formats of an exported sheet) or when the content
 * keeps its inline format (plain text cells).
 */
export function parseSquishableLiteral(
  getters: CoreGetters,
  content: string
): { value: number; format?: Format } | undefined {
  const cell = createLiteralCell(getters, -1, content, undefined, undefined);
  if (typeof cell.parsedValue !== "number" || cell.parsedValue % 1 !== 0) {
    return undefined;
  }
  return { value: cell.parsedValue, format: cell.format };
}

export class Squisher {
  private readonly getters: CoreGetters;
  // the base formula to compare against
  private baseFormula: CompiledFormula | undefined;
  // for each number in the base formula, how much offset has already been applied
  private alreadyAppliedNumberOffsets: number[] = [];
  // for each string in the base formula, the previous string value
  private previousStrings: string[] = [];
  // whether the base formula was already transformed. Formulas that have already been transformed must continue to be transformed
  private baseFormulaWasTransformed: boolean = false;

  private baseNumber: number | undefined = undefined;
  // the format the unsquisher will infer from the content of the base number
  private baseFormat: Format | undefined = undefined;

  constructor(getters: CoreGetters) {
    this.getters = getters;
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
    this.baseNumber = undefined;
    this.baseFormat = undefined;
  }

  /** Reset the base formula to undefined, resetting all offsets */
  resetBaseFormula() {
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
   *
   * @param emittedContent the content the unsquisher will receive when this cell is not
   *  squished. It is the cell content for an exported sheet, but callers sending something
   *  else must say so: `squishCommand` sends the command content, which keeps its inline
   *  format ("$100" instead of the cell content "100"). Numbers are not squished at all
   *  when it is omitted, as we cannot know which format the unsquisher will infer.
   * */
  squish(cell: Cell, forSheetId: UID, emittedContent?: string): SquishedContent {
    if (cell.isFormula) {
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

    // the unsquisher rebuilds the numbers from the content it receives, it has to be
    // squishable on its side too, with the very same value and format. Without knowing
    // which content it will receive, we cannot squish: we would guess its format.
    const squishableLiteral =
      emittedContent !== undefined && typeof cell.parsedValue === "number"
        ? parseSquishableLiteral(this.getters, emittedContent)
        : undefined;
    if (squishableLiteral) {
      this.resetBaseFormula();
      // for number cells, we can also apply squishing to get relative change if needed. We will treat them as formulas with only one number and no references or strings, and we will not set them as the base formula because they are not formulas.
      const { value: numberValue, format: numberFormat } = squishableLiteral;
      if (this.baseNumber === undefined) {
        this.baseFormat = numberFormat;
        this.baseNumber = numberValue;
        return cell.content;
      }
      const numberOffset = numberValue - this.baseNumber;
      if (numberOffset === 0) {
        this.baseFormat = numberFormat;
        return cell.content;
      } else {
        this.baseNumber = numberValue;
        if (this.baseFormat !== numberFormat) {
          // the offsets are rendered with the format of the base number: a different
          // format has to restart the squishing, otherwise the unsquisher would rebuild
          // a content with the format of the base number.
          this.baseFormat = numberFormat;
          return cell.content;
        }
        return { N: (numberOffset > 0 ? "+" : "") + numberOffset.toString() };
      }
    }
    this.resetBaseFormula();
    this.baseNumber = undefined;
    this.baseFormat = undefined;
    return cell.content;
  }

  public squishCommand(command: UpdateCellCommand): string | SquishedFormula | undefined {
    if (command.content !== undefined) {
      const cell = createCell(
        this.getters,
        -1,
        command.content,
        command.format,
        command.style ?? undefined,
        command.sheetId
      );
      // createCell will alter the content/format duo by extracting all the format from the
      // content. If there are multiple formats (inline + command.format), the content will be normalized
      // to a number (or other base w/h) and the squisher can then no longer compare the cells
      // in order to both preserve the inline format and the other.

      //
      const squished = this.squish(cell, command.sheetId, command.content);
      // Otherwise, cell.content might be different from command.content.
      // For example, if command.content is "$100", cell.content becomes "100"
      // and the format is stored separately. Here we want to keep the original
      // command.content so the collaborative history stays lossless.
      return typeof squished === "string" ? command.content : squished;
    }
    return command.content;
  }

  /**
   * Read all the consecutive cells with either the same content or the same transformation and merge their key into one zone
   * Do not join cells from different columns
   * */
  squishSheet(
    cells: { [key: string]: SquishedContent },
    sheetId: UID
  ): {
    [key: string]: SquishedContent;
  } {
    const allKeys = Object.keys(cells);
    const result: { [key: string]: SquishedContent } = {};
    for (let startIndex = 0; startIndex < allKeys.length; startIndex++) {
      const startKey = toCartesian(allKeys[startIndex]);
      let mergedRowCount = 0;

      for (mergedRowCount = 0; mergedRowCount + startIndex + 1 < allKeys.length; mergedRowCount++) {
        const nextKey = toCartesian(allKeys[mergedRowCount + startIndex + 1]);
        if (
          nextKey.col !== startKey.col || // different column, do not merge
          nextKey.row !== startKey.row + mergedRowCount + 1 || // not consecutive, do not merge
          !deepEquals(cells[allKeys[mergedRowCount + startIndex + 1]], cells[allKeys[startIndex]]) // different content, do not merge
        ) {
          break;
        }
      }

      if (mergedRowCount > 0) {
        // we have found consecutive cells with the same pattern or content, merge them
        const rangeKey = `${allKeys[startIndex]}:${toXC(
          startKey.col,
          startKey.row + mergedRowCount
        )}`;
        result[rangeKey] = cells[allKeys[startIndex]];
        startIndex += mergedRowCount;
      } else {
        const originalCell = this.getters.getCell({
          sheetId,
          col: startKey.col,
          row: startKey.row,
        });
        if (!originalCell?.isFormula && typeof originalCell?.parsedValue === "number") {
          result[allKeys[startIndex]] = originalCell.content;
        } else {
          result[allKeys[startIndex]] = cells[allKeys[startIndex]];
        }
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
    return references.map((reference, index) =>
      this.squishOneReference(reference, this.baseFormula!.rangeDependencies, index, forSheetId)
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

    return getRangeString(reference, forSheetId, this.getters.getSheetName);
  }

  /**
   * Squish the number parameters. Result for each parameter should be compared the previous formula.
   * The result can be:
   * - a relative change, e.g. +2 or -5 as string
   * - "=" meaning no change as string
   * */
  private squishNumbers(numbers: { value: number }[]) {
    const result: string[] = numbers.map((x) => NO_CHANGE);
    for (let i = 0; i < numbers.length; i++) {
      const previousValue = this.baseFormula!.literalValues.numbers[i].value;
      const currentValue = numbers[i].value;
      const previousOffset = this.alreadyAppliedNumberOffsets[i] || 0;
      const diff = currentValue - (previousValue + previousOffset);
      if (diff !== 0) {
        result[i] = "+" + diff.toString();
        this.alreadyAppliedNumberOffsets[i] = previousOffset + diff;
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
