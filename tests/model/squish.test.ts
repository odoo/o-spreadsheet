import { countDeepDifferences, UID } from "@odoo/o-spreadsheet-engine";
import { getRangeString } from "@odoo/o-spreadsheet-engine/build/js/o-spreadsheet-engine/src/helpers/range";
import { Cell, FormulaCell } from "@odoo/o-spreadsheet-engine/types/cells";
import { Range } from "@odoo/o-spreadsheet-engine/types/range";

class Squisher {
  previousCell: FormulaCell | undefined;
  stringDictionary: Map<string, number>;
  private getSheetName: (sheetId: UID) => string;

  constructor(getSheetName: (sheetId: UID) => string) {
    this.previousCell = undefined;
    this.stringDictionary = new Map();
    this.getSheetName = getSheetName;
  }

  squish(cell: Cell, forSheetId: UID) {
    if (!cell.isFormula) return { content: cell.content };

    if (!this.previousCell) {
      this.previousCell = cell;
      return {
        content: cell.compiledFormula.normalizedFormula,
        numbers: cell.compiledFormula.literalValues.numbers,
        strings: cell.compiledFormula.literalValues.strings,
        references: cell.compiledFormula.dependencies,
      };
    }
    if (
      this.previousCell.compiledFormula.normalizedFormula !== cell.compiledFormula.normalizedFormula
    ) {
      this.previousCell = cell;
      return {
        content: cell.compiledFormula.normalizedFormula,
        numbers: cell.compiledFormula.literalValues.numbers,
        strings: cell.compiledFormula.literalValues.strings,
        references: cell.compiledFormula.dependencies,
      };
    }

    const numbers = this.squishNumbers(cell.compiledFormula.literalValues.numbers);
    const strings = cell.compiledFormula.literalValues.strings.map((x) => x.value); // this.squishStrings(cell.compiledFormula.literalValues.strings);
    const references = this.squishReferences(cell.compiledFormula.dependencies, forSheetId);

    return {
      numbers,
      strings,
      references,
    };
  }

  private squishReferences(references: Range[], forSheetId: UID) {
    if (this.previousCell === undefined) throw new Error("No previous cell to squish against");
    const result: string[] = references.map((x, index) =>
      this.squishOneReference(x, this.previousCell!.compiledFormula.dependencies[index], forSheetId)
    );
    return result;
  }

  /**
   * Squish the references. Result for each reference should be compared the previous formula.
   * The result can be:
   * - a relative change, e.g. +C2 or +R5 as string
   * - the full reference if the reference is too different
   * */
  private squishOneReference(reference: Range, previousReference: Range, forSheetId: UID) {
    if (previousReference.sheetId !== reference.sheetId) {
      // sheet changed, cannot squish
      return getRangeString(reference, forSheetId, this.getSheetName);
    }
    if (countDeepDifferences(reference, previousReference) > 1) {
      // too different to squish
      return getRangeString(reference, forSheetId, this.getSheetName);
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
      const diffCol = previousReference.zone.left - reference.zone.left;
      const diffRow = previousReference.zone.top - reference.zone.top;
      if (diffCol > 0 && diffRow === 0) {
        return "+C" + diffCol.toString();
      } else if (diffRow > 0 && diffCol === 0) {
        return "+C" + diffRow.toString();
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
    const result: (number | string)[] = numbers.map((x) => x.value);
    for (let i = 0; i < numbers.length; i++) {
      const diff =
        this.previousCell!.compiledFormula.literalValues.numbers[i].value - numbers[i].value;
      if (numbers[i].value < 100 || diff.toString().length > 2) continue; // we keep 2 digits numbers as is or number with big diff

      if (diff === 0) {
        result[i] = "=";
      }
      result[i] = "+" + diff.toString();
    }
    return result;
  }
}

describe("squish similar formulas", () => {
  it("should squish identical formulas", () => {
    const getSheetName = (sheetId: UID) => "Sheet1";
    // const squisher = new Squisher(getSheetName);
    //
    // const cell1: create
  });

  it("should not squish different formulas", () => {});
});
