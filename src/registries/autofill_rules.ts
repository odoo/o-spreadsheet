import { isDateTimeFormat } from "../helpers";
import { evaluateLiteral } from "../helpers/cells";
import { AutofillModifier, Cell, CellValueType } from "../types/index";
import { EvaluatedCell } from "./../types/cells";
import { Registry } from "./registry";

/**
 * An AutofillRule is used to generate what to do when we need to autofill
 * a cell. (In a AutofillGenerator, see plugins/autofill.ts)
 *
 * When we generate the rules to autofill, we take the first matching rule
 * (ordered by sequence), and we generate the AutofillModifier with generateRule
 */
export interface AutofillRule {
  condition: (cell: Cell, cells: (Cell | undefined)[]) => boolean;
  generateRule: (cell: Cell, cells: (Cell | undefined)[]) => AutofillModifier;
  sequence: number;
}

export const autofillRulesRegistry = new Registry<AutofillRule>();

const numberPostfixRegExp = /(\d+)$/;
const stringPrefixRegExp = /^(.*\D+)/;
const alphaNumericValueRegExp = /^(.*\D+)(\d+)$/;

/**
 * Get the consecutive evaluated cells that can pass the filter function (e.g. certain type filter).
 * Return the one which contains the given cell
 */
function getGroup(
  cell: Cell,
  cells: (Cell | undefined)[],
  filter: (evaluatedCell: EvaluatedCell) => boolean
) {
  let group: EvaluatedCell[] = [];
  let found: boolean = false;
  for (let x of cells) {
    if (x === cell) {
      found = true;
    }
    const cellValue = x?.isFormula ? undefined : evaluateLiteral(x?.content);
    if (cellValue && filter(cellValue)) {
      group.push(cellValue);
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

/**
 * Get the step for a group
 */
function calculateIncrementBasedOnGroup(group: number[]) {
  let increment = 1;
  if (group.length >= 2) {
    increment = getAverageIncrement(group) * group.length;
  }
  return increment;
}

autofillRulesRegistry
  .add("simple_value_copy", {
    condition: (cell: Cell, cells: (Cell | undefined)[]) => {
      return (
        cells.length === 1 && !cell.isFormula && !(cell.format && isDateTimeFormat(cell.format))
      );
    },
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 10,
  })
  .add("increment_alphanumeric_value", {
    condition: (cell: Cell) =>
      !cell.isFormula &&
      evaluateLiteral(cell.content).type === CellValueType.text &&
      alphaNumericValueRegExp.test(cell.content),
    generateRule: (cell: Cell, cells: Cell[]) => {
      const numberPostfix = parseInt(cell.content.match(numberPostfixRegExp)![0]);
      const prefix = cell.content.match(stringPrefixRegExp)![0];
      const numberPostfixLength = cell.content.length - prefix.length;
      const group = getGroup(
        cell,
        cells,
        (evaluatedCell) =>
          evaluatedCell.type === CellValueType.text &&
          alphaNumericValueRegExp.test(evaluatedCell.value)
      ) // get consecutive alphanumeric cells, no matter what the prefix is
        .filter((cell) => prefix === cell.value.toString().match(stringPrefixRegExp)![0])
        .map((cell) => parseInt(cell.value.toString().match(numberPostfixRegExp)![0]));
      const increment = calculateIncrementBasedOnGroup(group);
      return {
        type: "ALPHANUMERIC_INCREMENT_MODIFIER",
        prefix,
        current: numberPostfix,
        increment,
        numberPostfixLength,
      };
    },
    sequence: 15,
  })
  .add("copy_text", {
    condition: (cell: Cell) =>
      !cell.isFormula && evaluateLiteral(cell.content).type === CellValueType.text,
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 20,
  })
  .add("update_formula", {
    condition: (cell: Cell) => cell.isFormula,
    generateRule: (_, cells: (Cell | undefined)[]) => {
      return { type: "FORMULA_MODIFIER", increment: cells.length, current: 0 };
    },
    sequence: 30,
  })
  .add("increment_number", {
    condition: (cell: Cell) =>
      !cell.isFormula && evaluateLiteral(cell.content).type === CellValueType.number,
    generateRule: (cell: Cell, cells: (Cell | undefined)[]) => {
      const group = getGroup(
        cell,
        cells,
        (evaluatedCell) => evaluatedCell.type === CellValueType.number
      ).map((cell) => Number(cell.value));
      const increment = calculateIncrementBasedOnGroup(group);
      const evaluation = evaluateLiteral(cell.content);
      return {
        type: "INCREMENT_MODIFIER",
        increment,
        current: evaluation.type === CellValueType.number ? evaluation.value : 0,
      };
    },
    sequence: 40,
  });
