import { countDeepDifferences } from "../../helpers";
import { toCartesian, toXC } from "../../helpers/coordinates";
import { getRangeString } from "../../helpers/range";
import { Cell, FormulaCell } from "../../types/cells";
import { UID } from "../../types/misc";
import { Range } from "../../types/range";

interface SquishedFormula {
  C: string;
  N?: string;
  S?: string[];
  R?: string;
}

export type SquishedCell = string | Partial<SquishedFormula>;

export class Squisher {
  previousCell: FormulaCell | undefined;
  private readonly getSheetName: (sheetId: UID) => string;
  private alreadyAppliedOffsets = [
    {
      rows: 0,
      cols: 0,
    },
  ];
  private alreadyAppliedNumberOffsets: number[] = [];
  private previousStrings: string[] = [];
  private previousNumberPattern: string | null = null;
  private previousReferencePattern: string | null = null;

  constructor(getSheetName: (sheetId: UID) => string) {
    this.getSheetName = getSheetName;
  }

  buildResultExcludingIdentical(
    numbers: string[],
    strings: string[],
    references: string[]
  ): Partial<SquishedFormula> {
    const res: Partial<SquishedFormula> = {};
    if (numbers.length && numbers.some((x) => x !== "=")) {
      const numberPattern = numbers.join("|");
      if (this.previousNumberPattern !== numberPattern) {
        this.previousNumberPattern = numberPattern;
        res["N"] = numberPattern;
      }
    }
    if (strings.length && strings.some((x) => x !== "=")) {
      res["S"] = strings;
    }
    if (references.length && references.some((x) => x !== "=")) {
      const referencePattern = references.join("|");
      if (this.previousReferencePattern !== referencePattern) {
        this.previousReferencePattern = referencePattern;
        res["R"] = referencePattern;
      }
    }
    return res;
  }

  resetBaseTo(cell: FormulaCell) {
    this.previousReferencePattern = null;
    this.previousNumberPattern = null;
    this.previousCell = cell;
    this.alreadyAppliedOffsets = cell.compiledFormula.dependencies.map(() => ({
      rows: 0,
      cols: 0,
    }));
    this.alreadyAppliedNumberOffsets = cell.compiledFormula.literalValues.numbers.map((_) => 0);
    this.previousStrings = cell.compiledFormula.literalValues.strings.map((x) => x.value);
  }

  squish(cell: Cell, forSheetId: UID): SquishedCell {
    if (!cell.isFormula) return cell.content;

    let numbers: string[] = [];
    let strings: string[] = [];
    let references: string[] = [];

    if (
      !this.previousCell ||
      this.previousCell.compiledFormula.normalizedFormula !== cell.compiledFormula.normalizedFormula
    ) {
      this.resetBaseTo(cell);
      return cell.content;
    } else {
      numbers = this.squishNumbers(cell.compiledFormula.literalValues.numbers);
      strings = this.squishStrings(cell.compiledFormula.literalValues.strings);
      references = this.squishReferences(cell.compiledFormula.dependencies, forSheetId);
    }
    return this.buildResultExcludingIdentical(numbers, strings, references);
  }

  /**
   * find all the consecutive cells with {} as content and merge their key into one cell
   * example: {A1: "=sum(B1)", A2: {R:"+R1"}, A3: "{}", A4: "{}"} becomes {A1: "=sum(B1)", A2:A4: "{R:"+R1"}"}
   * */
  squishSheet(cells: { [key: string]: string }): { [key: string]: string } {
    const allKeys = Object.keys(cells);
    const result: { [key: string]: string } = {};
    for (let i = 0; i < allKeys.length; i++) {
      const startKey = toCartesian(allKeys[i]);
      let offset = 0;
      for (let j = i + 1; j < allKeys.length; j++) {
        const nextKey = toCartesian(allKeys[j]);
        if (nextKey.col === startKey.col) {
          // same column, check if consecutive row
          if (nextKey.row === startKey.row + offset + 1) {
            if (
              typeof cells[allKeys[j]] === "object" &&
              Object.keys(cells[allKeys[j]]).length === 0
            ) {
              // consecutive empty cell, continue
              offset += 1;
            }
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
    if (this.previousCell === undefined) throw new Error("No previous cell to squish against");
    return references.map((x, index) =>
      this.squishOneReference(
        x,
        this.previousCell!.compiledFormula.dependencies[index],
        forSheetId,
        this.alreadyAppliedOffsets[index]
      )
    );
  }

  private squishOneReference(
    reference: Range,
    previousReference: Range,
    forSheetId: UID,
    alreadyAppliedOffsets: {
      rows: number;
      cols: number;
    }
  ) {
    if (previousReference.sheetId !== reference.sheetId) {
      // sheet changed, cannot squish
      return getRangeString(reference, forSheetId, this.getSheetName);
    }
    const countDiff = countDeepDifferences(reference, previousReference);
    if (countDiff === 0) {
      // identical
      return "=";
    }

    const currentZone = reference.zone;
    const previousZone = previousReference.zone;
    if (
      currentZone.left === currentZone.right &&
      currentZone.top === currentZone.bottom &&
      previousZone.left === previousZone.right &&
      previousZone.top === previousZone.bottom
    ) {
      // 1D range squishing
      const diffCol =
        reference.zone.left - (previousReference.zone.left + alreadyAppliedOffsets.cols);
      const diffRow =
        reference.zone.top - (previousReference.zone.top + alreadyAppliedOffsets.rows);
      if (diffCol !== 0 && diffRow === 0) {
        alreadyAppliedOffsets.cols += diffCol;
        return "+C" + diffCol.toString();
      } else if (diffRow !== 0 && diffCol === 0) {
        alreadyAppliedOffsets.rows += diffRow;
        return "+R" + diffRow.toString();
      }
    }
    return getRangeString(reference, forSheetId, this.getSheetName);
  }

  /**
   * Squish the number parameters. Result for each parameter should be compared the previous formula.
   * The result can be:
   * - a relative change, e.g. +2 or -5 as string
   * - "=" meaning no change as string
   * - the full number if the number is less than 100 or the change is big (more than 2 digits) as number
   * */
  private squishNumbers(numbers: { value: number }[]) {
    const result: string[] = numbers.map((x) => "=");
    for (let i = 0; i < numbers.length; i++) {
      const diff =
        numbers[i].value -
        (this.previousCell!.compiledFormula.literalValues.numbers[i].value +
          this.alreadyAppliedNumberOffsets[i] || 0);

      if (diff !== 0) {
        result[i] = "+" + diff.toString();
        this.alreadyAppliedNumberOffsets[i] = (this.alreadyAppliedNumberOffsets[i] || 0) + diff;
      }
    }
    return result;
  }

  private squishStrings(strings: { value: string }[]) {
    const result: string[] = strings.map((x) => "=");
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
