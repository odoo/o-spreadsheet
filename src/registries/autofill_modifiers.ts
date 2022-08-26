import { formatValue } from "../helpers/format";
import { Registry } from "../registry";
import {
  AutofillData,
  AutofillModifierImplementation,
  CopyModifier,
  DIRECTION,
  FormulaModifier,
  Getters,
  IncrementModifier,
} from "../types/index";

/**
 * An AutofillModifierImplementation is used to describe how to handle a
 * AutofillModifier.
 */

export const autofillModifiersRegistry = new Registry<AutofillModifierImplementation>();

autofillModifiersRegistry
  .add("INCREMENT_MODIFIER", {
    apply: (rule: IncrementModifier, data: AutofillData) => {
      rule.current += rule.increment;
      const content = rule.current.toString();
      const tooltipValue = formatValue(rule.current, data.cell?.format);
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
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content,
        },
        tooltip: content ? { props: { content: data.cell?.formattedValue } } : undefined,
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
      if (!cell || !cell.isValidFormula) {
        return { cellData: {} };
      }
      const sheetId = data.sheetId;
      const ranges = getters.createAdaptedRanges(cell.dependencies, x, y, sheetId);
      const content = getters.buildFormulaContent(sheetId, cell, ranges);
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
