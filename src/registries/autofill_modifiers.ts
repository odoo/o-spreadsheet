import { Registry } from "../registry";
import {
  AutofillData,
  AutofillModifierImplementation,
  CellType,
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
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content,
        },
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  })
  .add("COPY_MODIFIER", {
    apply: (rule: CopyModifier, data: AutofillData, getters: Getters) => {
      const content = (data.cell && getters.getCellText(data.cell, data.sheetId)) || "";
      return {
        cellData: {
          border: data.border,
          style: data.cell && data.cell.style,
          format: data.cell && data.cell.format,
          content,
        },
        tooltip: content ? { props: { content: content } } : undefined,
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
      if (!data.cell || data.cell.type !== CellType.formula) {
        return { cellData: {} };
      }
      const sheetId = data.sheetId;
      const ranges = getters.createAdaptedRanges(data.cell.dependencies, x, y, sheetId);
      const content = getters.buildFormulaContent(sheetId, data.cell.formula.text, ranges);
      return {
        cellData: {
          border: data.border,
          style: data.cell.style,
          format: data.cell.format,
          content,
        },
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  });
