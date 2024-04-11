import { evaluateLiteral } from "../helpers/cells";
import { formatValue } from "../helpers/format";
import {
  AutofillData,
  AutofillModifierImplementation,
  CopyModifier,
  DIRECTION,
  FormulaModifier,
  Getters,
  IncrementModifier,
} from "../types/index";
import { AlphanumericIncrementModifier } from "./../types/autofill";
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
      const content = `${rule.prefix}${rule.current
        .toString()
        .padStart(rule.numberPostfixLength || 0, "0")}`;
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
  .add("COPY_MODIFIER", {
    apply: (rule: CopyModifier, data: AutofillData, getters: Getters) => {
      const content = data.cell?.content || "";
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
                content: evaluateLiteral(data.cell?.content, localeFormat).formattedValue,
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
      const content = getters.getTranslatedCellFormula(sheetId, x, y, cell.compiledFormula.tokens);
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
