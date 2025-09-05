import { toJsDate } from "../functions/helpers";
import { jsDateToNumber } from "../helpers";
import { evaluateLiteral } from "../helpers/cells";
import { formatValue } from "../helpers/format/format";
import {
  AutofillModifierImplementation,
  Cell,
  CopyModifier,
  DIRECTION,
  FormulaModifier,
  Getters,
  IncrementModifier,
  LiteralCell,
} from "../types/index";
import { AlphanumericIncrementModifier, DateIncrementModifier } from "./../types/autofill";
import { Registry } from "./registry";

/**
 * An AutofillModifierImplementation is used to describe how to handle a
 * AutofillModifier.
 */

export const autofillModifiersRegistry = new Registry<AutofillModifierImplementation>();

autofillModifiersRegistry
  .add("ALPHANUMERIC_INCREMENT_MODIFIER", {
    apply: (getters: Getters, rule: AlphanumericIncrementModifier, originCell: Cell) => {
      rule.current += rule.increment;
      let value = Math.abs(rule.current).toString();
      value = "0".repeat(Math.max(rule.numberPostfixLength - value.length, 0)) + value;
      const content = `${rule.prefix}${value}`;
      return {
        content,
      };
    },
    tooltip: (
      getters: Getters,
      content: string,
      rule: AlphanumericIncrementModifier,
      originCell: Cell
    ) => {
      return {
        props: {
          content: content,
        },
      };
    },
  })
  .add("INCREMENT_MODIFIER", {
    apply: (getters: Getters, rule: IncrementModifier, originCell: Cell) => {
      rule.current += rule.increment;
      const content = rule.current.toString();
      return {
        content,
      };
    },
    tooltip: (getters: Getters, content: string, rule: IncrementModifier, originCell: Cell) => {
      const locale = getters.getLocale();
      const tooltipValue = formatValue(rule.current, { format: originCell.format, locale });
      return { props: { content: tooltipValue } };
    },
  })
  .add("DATE_INCREMENT_MODIFIER", {
    apply: (getters: Getters, rule: DateIncrementModifier, originCell: Cell) => {
      const date = toJsDate(rule.current, getters.getLocale());
      date.setFullYear(date.getFullYear() + rule.increment.years || 0);
      date.setMonth(date.getMonth() + rule.increment.months || 0);
      date.setDate(date.getDate() + rule.increment.days || 0);

      const value = jsDateToNumber(date);
      rule.current = value;
      return {
        content: value.toString(),
      };
    },
    tooltip: (getters: Getters, content: string, rule: DateIncrementModifier, originCell: Cell) => {
      const locale = getters.getLocale();
      const tooltipValue = formatValue(rule.current, { format: originCell.format, locale });
      return { props: { content: tooltipValue } };
    },
  })
  .add("COPY_MODIFIER", {
    apply: (getters: Getters, rule: CopyModifier, originCell: Cell) => {
      const content = originCell.content || "";
      return { content };
    },
    tooltip: (getters: Getters, content: string, rule: CopyModifier, originCell: Cell) => {
      const localeFormat = { locale: getters.getLocale(), format: originCell.format };
      return {
        props: {
          content: evaluateLiteral(originCell as LiteralCell, localeFormat).formattedValue,
        },
      };
    },
  })
  .add("FORMULA_MODIFIER", {
    apply: (getters: Getters, rule: FormulaModifier, originCell: Cell, direction: DIRECTION) => {
      rule.current += rule.increment;
      let x = 0;
      let y = 0;
      switch (direction) {
        case DIRECTION.UP:
          x = 0;
          y = -rule.current;
          break;
        case DIRECTION.DOWN:
          x = 0;
          y = rule.current;
          break;
        case DIRECTION.LEFT:
          x = -rule.current;
          y = 0;
          break;
        case DIRECTION.RIGHT:
          x = rule.current;
          y = 0;
          break;
      }
      const cell = originCell;
      if (!cell || !cell.isFormula) {
        return { content: "" };
      }
      const sheetId = getters.getCellPosition(originCell.id).sheetId;
      const content = getters.getTranslatedCellFormula(sheetId, x, y, cell.compiledFormula.tokens);
      return { content };
    },
    tooltip: (getters: Getters, content: string, rule: FormulaModifier, originCell: Cell) => {
      return { props: { content } };
    },
  });
