import { DATETIME_FORMAT } from "../constants";
import { Registry } from "../registry";
import { AutofillModifier, Cell, CellType, FormulaCell, OtherCell } from "../types/index";

/**
 * An AutofillRule is used to generate what to do when we need to autofill
 * a cell. (In a AutofillGenerator, see plugins/autofill.ts)
 *
 * When we generate the rules to autofill, we take the first matching rule
 * (ordered by sequence), and we generate the AutofillModifier with generateRule
 */
interface AutofillRule {
  condition: (cell: Cell, cells: (Cell | undefined)[]) => boolean;
  generateRule: (cell: Cell, cells: (Cell | undefined)[]) => AutofillModifier;
  sequence: number;
}

export const autofillRulesRegistry = new Registry<AutofillRule>();

/**
 * Get the consecutive xc that are of type "number" or "date".
 * Return the one which contains the given cell
 */
function getGroup(cell: Cell, cells: (Cell | undefined)[]): number[] {
  let group: number[] = [];
  let found: boolean = false;
  for (let x of cells) {
    if (x === cell) {
      found = true;
    }
    if (x && x.type === CellType.number) {
      if (typeof x!.value === "number") {
        group.push(x!.value);
      }
    } else {
      if (found) {
        return group;
      }
      group = [];
    }
  }
  return group;
}

/**
 * Get the average steps between numbers
 */
function getAverageIncrement(group: number[]) {
  const averages: number[] = [];
  let last = group[0];
  for (let i = 1; i < group.length; i++) {
    const current = group[i];
    averages.push(current - last);
    last = current;
  }
  return averages.reduce((a, b) => a + b, 0) / averages.length;
}

autofillRulesRegistry
  .add("simple_value_copy", {
    condition: (cell: Cell, cells: (Cell | undefined)[]) => {
      return (
        cells.length === 1 &&
        [CellType.text, CellType.number].includes(cell.type) &&
        !cell.format?.match(DATETIME_FORMAT)
      );
    },
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 10,
  })
  .add("copy_text", {
    condition: (cell: Cell) => cell.type === CellType.text,
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 20,
  })
  .add("update_formula", {
    condition: (cell: Cell) => cell.type === CellType.formula,
    generateRule: (_, cells: (FormulaCell | undefined)[]) => {
      return { type: "FORMULA_MODIFIER", increment: cells.length, current: 0 };
    },
    sequence: 30,
  })
  .add("increment_number", {
    condition: (cell: Cell) => cell.type === CellType.number,
    generateRule: (cell: Cell, cells: (OtherCell | undefined)[]) => {
      const group = getGroup(cell, cells);
      let increment: number = 1;
      if (group.length == 2) {
        increment = (group[1] - group[0]) * 2;
      } else if (group.length > 2) {
        increment = getAverageIncrement(group) * group.length;
      }
      return {
        type: "INCREMENT_MODIFIER",
        increment,
        current: typeof cell.value === "number" ? cell.value : 0,
      };
    },
    sequence: 40,
  });
