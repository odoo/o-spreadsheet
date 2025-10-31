import { toJsDate } from "../functions/helpers";
import { evaluateLiteral } from "../helpers/cells/cell_evaluation";
import {
  DateTime,
  getTimeDifferenceInWholeDays,
  getTimeDifferenceInWholeMonths,
  getTimeDifferenceInWholeYears,
} from "../helpers/dates";
import { isDateTimeFormat } from "../helpers/format/format";
import { AutofillModifier } from "../types/autofill";
import { Cell, CellValueType, EvaluatedCell, LiteralCell } from "../types/cells";
import { DEFAULT_LOCALE } from "../types/locale";
import { DIRECTION } from "../types/misc";
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
  generateRule: (cell: Cell, cells: (Cell | undefined)[], direction: DIRECTION) => AutofillModifier;
  sequence: number;
}

// TODOOOO FIX the format in this file

export interface CalendarDateInterval {
  years: number;
  months: number;
  days: number;
}

export const autofillRulesRegistry = new Registry<AutofillRule>();

const numberPostfixRegExp = /(\d+)$/;
const stringPrefixRegExp = /^(.*\D+)/;
const alphaNumericValueRegExp = /^(.*\D+)(\d+)$/;
const leadingZerosRegex = /^0*/;

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
  for (const x of cells) {
    if (x === cell) {
      found = true;
    }
    const cellValue =
      x === undefined || x.isFormula ? undefined : evaluateLiteral(x, { locale: DEFAULT_LOCALE });
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

/**
 * Iterates on a list of date intervals.
 * if every interval is the same, return the interval
 * Otherwise return undefined
 *
 */
function getEqualInterval(intervals: CalendarDateInterval[]): CalendarDateInterval | undefined {
  if (intervals.length < 2) {
    return intervals[0] || { years: 0, months: 0, days: 0 };
  }

  const equal = intervals.every(
    (interval) =>
      interval.years === intervals[0].years &&
      interval.months === intervals[0].months &&
      interval.days === intervals[0].days
  );
  return equal ? intervals[0] : undefined;
}

/**
 * Based on a group of dates, calculate the increment that should be applied
 * to the next date.
 *
 * This will compute the date difference in calendar terms (years, months, days)
 * In order to make abstraction of leap years and months with different number of days.
 *
 * In case the dates are not equidistant in calendar terms, no rule can be extrapolated
 * In case of equidistant dates, we either have in that order:
 *  - exact date interval (e.g. +n year OR +n month OR +n day) in which case we increment by the same interval
 *  - exact day interval (e.g. +n days) in which case we increment by the same day interval
 *  - equidistant dates but not the same interval, in which case we return increment of the same interval
 *
 * */
function calculateDateIncrementBasedOnGroup(group: number[]) {
  if (group.length < 2) {
    return 1;
  }

  const jsDates = group.map((date) => toJsDate(date, DEFAULT_LOCALE));

  const datesIntervals = getDateIntervals(jsDates);

  const datesEquidistantInterval = getEqualInterval(datesIntervals);
  if (datesEquidistantInterval === undefined) {
    // dates are not equidistant in terms of years, months or days, thus no rule can be extrapolated
    return undefined;
  }

  // The dates are apart by an exact interval of years, months or days
  // but not a combination of them
  const exactDateInterval =
    Object.values(datesEquidistantInterval).filter((value) => value !== 0).length === 1;
  const isSameDay = Object.values(datesEquidistantInterval).every((el) => el === 0); // handles time values (strict decimals)

  if (!exactDateInterval || isSameDay) {
    const timeIntervals = jsDates
      .map((date, index) => {
        if (index === 0) {
          return 0;
        }
        const previous = jsDates[index - 1];
        return Math.floor(date.getTime()) - Math.floor(previous.getTime());
      })
      .slice(1);
    const equidistantDates = timeIntervals.every((interval) => interval === timeIntervals[0]);

    if (equidistantDates) {
      return group.length * (group[1] - group[0]);
    }
  }

  return {
    years: datesEquidistantInterval.years * group.length,
    months: datesEquidistantInterval.months * group.length,
    days: datesEquidistantInterval.days * group.length,
  };
}

autofillRulesRegistry
  .add("simple_value_copy", {
    condition: (cell: Cell, cells: (Cell | undefined)[]) => {
      return cells.length === 1 && !cell.isFormula;
    },
    generateRule: () => {
      return { type: "COPY_MODIFIER" };
    },
    sequence: 10,
  })
  .add("increment_alphanumeric_value", {
    condition: (cell: Cell) =>
      !cell.isFormula &&
      evaluateLiteral(cell, { locale: DEFAULT_LOCALE }).type === CellValueType.text &&
      alphaNumericValueRegExp.test(cell.content),
    generateRule: (cell: Cell, cells: Cell[], direction: DIRECTION) => {
      const numberPostfix = parseInt(cell.content.match(numberPostfixRegExp)![0]);
      const prefix = cell.content.match(stringPrefixRegExp)![0];
      const group = getGroup(
        cell,
        cells,
        (evaluatedCell) =>
          evaluatedCell.type === CellValueType.text &&
          alphaNumericValueRegExp.test(evaluatedCell.value)
      )
        // get consecutive alphanumeric cells, no matter what the prefix is
        .filter((cell) => prefix === (cell.value ?? "").toString().match(stringPrefixRegExp)![0])
        .map((cell) => (cell.value ?? "").toString().match(numberPostfixRegExp)![0]);

      // find the length of number with the most leading zeros
      const mostLeadingZeros: [string, number] = group.reduce(
        (candidate: [string, number], current) => {
          const currentLength = current.match(leadingZerosRegex)![0].length;
          return currentLength > candidate[1] ? [current, currentLength] : candidate;
        },
        [group[0], 0]
      );
      const numberPostfixLength = mostLeadingZeros[1] ? mostLeadingZeros[0].length : 0;
      let increment = calculateIncrementBasedOnGroup(group.map((x) => parseInt(x)));
      if (["up", "left"].includes(direction) && group.length === 1) {
        increment = -increment;
      }
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
      !cell.isFormula &&
      evaluateLiteral(cell, { locale: DEFAULT_LOCALE }).type === CellValueType.text,
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
  .add("increment_dates", {
    condition: (cell: Cell, cells: (Cell | undefined)[]) => {
      return (
        !cell.isFormula &&
        evaluateLiteral(cell, { locale: DEFAULT_LOCALE }).type === CellValueType.number
      );
    },
    generateRule: (cell: LiteralCell, cells: (Cell | undefined)[]) => {
      const group = getGroup(
        cell,
        cells,
        (evaluatedCell) =>
          evaluatedCell.type === CellValueType.number &&
          !!evaluatedCell.format &&
          isDateTimeFormat(evaluatedCell.format)
      ).map((cell) => Number(cell.value));
      const increment = calculateDateIncrementBasedOnGroup(group);
      if (increment === undefined) {
        return { type: "COPY_MODIFIER" };
      }
      /**  requires to detect the current date (requires to be an integer value  with the right format)
       * detect  if year  or if month or if day then extrapolate increment required (+1 month, +1 year + 1 day)
       */
      const evaluation = evaluateLiteral(cell, { locale: DEFAULT_LOCALE });
      if (typeof increment === "object") {
        return {
          type: "DATE_INCREMENT_MODIFIER",
          increment,
          current: evaluation.type === CellValueType.number ? evaluation.value : 0,
        };
      }
      return {
        type: "INCREMENT_MODIFIER",
        increment,
        current: evaluation.type === CellValueType.number ? evaluation.value : 0,
      };
    },
    sequence: 25,
  })
  .add("increment_number", {
    condition: (cell: Cell) =>
      !cell.isFormula &&
      evaluateLiteral(cell, { locale: DEFAULT_LOCALE }).type === CellValueType.number,
    generateRule: (cell: LiteralCell, cells: (Cell | undefined)[], direction: DIRECTION) => {
      const group = getGroup(
        cell,
        cells,
        (evaluatedCell) =>
          evaluatedCell.type === CellValueType.number &&
          !isDateTimeFormat(evaluatedCell.format || "")
      ).map((cell) => Number(cell.value));
      let increment = calculateIncrementBasedOnGroup(group);
      if (["up", "left"].includes(direction) && group.length === 1) {
        increment = -increment;
      }
      const evaluation = evaluateLiteral(cell, { locale: DEFAULT_LOCALE });
      return {
        type: "INCREMENT_MODIFIER",
        increment,
        current: evaluation.type === CellValueType.number ? evaluation.value : 0,
      };
    },
    sequence: 40,
  });

/**
 * Returns the date intervals between consecutive dates of an array
 * in the format of { years: number, months: number, days: number }
 *
 * The split is necessary to make abstraction of leap years and
 * months with different number of days.
 *
 * @param dates
 */
function getDateIntervals(dates: DateTime[]): CalendarDateInterval[] {
  if (dates.length < 2) {
    return [{ years: 0, months: 0, days: 0 }];
  }

  const res = dates.map((date, index) => {
    if (index === 0) {
      return { years: 0, months: 0, days: 0 };
    }
    const previous = DateTime.fromTimestamp(dates[index - 1].getTime());
    const years = getTimeDifferenceInWholeYears(previous, date);
    const months = getTimeDifferenceInWholeMonths(previous, date) % 12;
    previous.setFullYear(previous.getFullYear() + years);
    previous.setMonth(previous.getMonth() + months);

    const days = getTimeDifferenceInWholeDays(previous, date);

    return {
      years,
      months,
      days,
    };
  });
  return res.slice(1);
}
