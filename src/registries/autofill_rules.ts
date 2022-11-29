import { Registry } from "../registry";
import { AutofillModifier, Cell } from "../types/index";

/**
 * An AutofillRule is used to generate what to do when we need to autofill
 * a cell. (In a AutofillGenerator, see plugins/autofill.ts)
 *
 * When we generate the rules to autofill, we take the first matching rule
 * (ordered by sequence), and we generate the AutofillModifier with generateRule
 */
export interface AutofillRule {
  condition: (cell: Cell, cells: (Cell | null)[]) => boolean;
  generateRule: (cell: Cell, cells: (Cell | null)[]) => AutofillModifier;
  sequence: number;
}

export const autofillRulesRegistry = new Registry<AutofillRule>();

/**
 * Get the consecutive xc that are of type "number".
 * Return the one which contains the given cell
 */
function getGroup(cell: Cell, cells: (Cell | null)[]): string[] {
  let group: string[] = [];
  let found: boolean = false;
  for (let x of cells) {
    if (x === cell) {
      found = true;
    }
    if (!x || x.type !== "number") {
      if (found) {
        return group;
      }
      group = [];
    }
    if (x && x.type === "number" && x.content) {
      group.push(x.content);
    }
  }
  return group;
}

/**
 * Get the average steps between numbers
 */
function getAverageIncrement(group: string[]) {
  const averages: number[] = [];
  let last = parseFloat(group[0]);
  for (let i = 1; i < group.length; i++) {
    const current = parseFloat(group[i]);
    averages.push(current - last);
    last = current;
  }
  return averages.reduce((a, b) => a + b, 0) / averages.length;
}

autofillRulesRegistry
  .add("simple_value_copy", {
    condition: (cell: Cell, cells: (Cell | null)[]) => {
      return cells.length === 1 && ["text", "date", "number"].includes(cell.type);
    },
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 10,
  })
  .add("copy_text", {
    condition: (cell: Cell) => cell.type === "text",
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 20,
  })
  .add("update_formula", {
    condition: (cell: Cell) => cell.type === "formula",
    generateRule: (_, cells: (Cell | null)[]) => {
      return { type: "FORMULA_MODIFIER", increment: cells.length, current: 0 };
    },
    sequence: 30,
  })
  .add("increment_number", {
    condition: (cell: Cell) => cell.type === "number",
    generateRule: (cell: Cell, cells: (Cell | null)[]) => {
      const group = getGroup(cell, cells);
      let increment: number = 1;
      if (group.length == 2) {
        increment = (parseFloat(group[1]) - parseFloat(group[0])) * 2;
      } else if (group.length > 2) {
        increment = getAverageIncrement(group) * group.length;
      }
      return {
        type: "INCREMENT_MODIFIER",
        increment,
        current: 0,
      };
    },
    sequence: 40,
  });
