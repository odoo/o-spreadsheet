import { toJsDate } from "../functions/helpers";
import { evaluateLiteral } from "../helpers/cells/cell_evaluation";
import { jsDateToNumber } from "../helpers/dates";
import { formatValue } from "../helpers/format/format";
import {
  AlphanumericIncrementModifier,
  AutofillData,
  AutofillModifierImplementation,
  CopyModifier,
  DateIncrementModifier,
  FormulaModifier,
  IncrementModifier,
} from "../types/autofill";
import { LiteralCell } from "../types/cells";
import { Getters } from "../types/getters";
import { DIRECTION } from "../types/misc";
import { Registry } from "./registry";

/**
 * An AutofillModifierImplementation is used to describe how to handle a
 * AutofillModifier.
 */
export const autofillModifiersRegistry = new Registry<AutofillModifierImplementation>();

autofillModifiersRegistry
  .add("ALPHANUMERIC_INCREMENT_MODIFIER", {
    apply: (rule: AlphanumericIncrementModifier, data: AutofillData) => {
      rule.current += rule.increment;
      let value = Math.abs(rule.current).toString();
      value = "0".repeat(Math.max(rule.numberPostfixLength - value.length, 0)) + value;
      const content = `${rule.prefix}${value}`;
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content,
        },
        tooltip: { props: { content } },
      };
    },
  })
  .add("INCREMENT_MODIFIER", {
    apply: (rule: IncrementModifier, data: AutofillData, getters: Getters) => {
      rule.current += rule.increment;
      const content = rule.current.toString();
      const locale = getters.getLocale();
      const tooltipValue = formatValue(rule.current, { format: data.cell?.format, locale });
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content,
        },
        tooltip: content ? { props: { content: tooltipValue } } : undefined,
      };
    },
  })
  .add("DATE_INCREMENT_MODIFIER", {
    apply: (rule: DateIncrementModifier, data: AutofillData, getters: Getters) => {
      const date = toJsDate(rule.current, getters.getLocale());
      date.setFullYear(date.getFullYear() + rule.increment.years || 0);
      date.setMonth(date.getMonth() + rule.increment.months || 0);
      date.setDate(date.getDate() + rule.increment.days || 0);

      const value = jsDateToNumber(date);
      rule.current = value;
      const locale = getters.getLocale();
      const tooltipValue = formatValue(value, { format: data.cell?.format, locale });
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content: value.toString(),
        },
        tooltip: value ? { props: { content: tooltipValue } } : undefined,
      };
    },
  })
  .add("COPY_MODIFIER", {
    apply: (rule: CopyModifier, data: AutofillData, getters: Getters) => {
      const content = !data.cell?.isFormula
        ? data.cell?.content || ""
        : data.cell?.compiledFormula.toFormulaString(getters);
      const localeFormat = { locale: getters.getLocale(), format: data.cell?.format };
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content,
        },
        tooltip: content
          ? {
              props: {
                content: data.cell
                  ? evaluateLiteral(data.cell as LiteralCell, localeFormat).formattedValue
                  : "",
              },
            }
          : undefined,
      };
    },
  })
  .add("FORMULA_MODIFIER", {
    apply: (rule: FormulaModifier, data: AutofillData, getters: Getters, direction: DIRECTION) => {
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
      const cell = data.cell;
      if (!cell || !cell.isFormula) {
        return { cellData: {} };
      }
      const sheetId = data.sheetId;
      const content = getters.getTranslatedCellFormula(sheetId, x, y, cell.compiledFormula);
      return {
        cellData: {
          border: data.border,
          style: cell.style,
          format: cell.format,
          content,
        },
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  });
