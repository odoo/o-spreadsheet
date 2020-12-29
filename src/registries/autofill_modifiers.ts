import {
  Getters,
  DIRECTION,
  AutofillModifier,
  IncrementModifier,
  CopyModifier,
  FormulaModifier,
  Tooltip,
  AutofillCellData,
} from "../types/index";
import { Registry } from "../registry";

/**
 * An AutofillModifierImplementation is used to describe how to handle a
 * AutofillModifier.
 */
interface AutofillModifierImplementation {
  apply: (
    rule: AutofillModifier,
    data: AutofillCellData,
    getters: Getters,
    direction: DIRECTION
  ) => { cellData: AutofillCellData; tooltip?: Tooltip };
}

export const autofillModifiersRegistry = new Registry<AutofillModifierImplementation>();

autofillModifiersRegistry
  .add("INCREMENT_MODIFIER", {
    apply: (rule: IncrementModifier, data: AutofillCellData) => {
      rule.current += rule.increment;
      const content = rule.current.toString();
      return {
        cellData: Object.assign({}, data, { content }),
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  })
  .add("COPY_MODIFIER", {
    apply: (rule: CopyModifier, data: AutofillCellData) => {
      return {
        cellData: data,
        tooltip: data.content ? { props: { content: data.content } } : undefined,
      };
    },
  })
  .add("FORMULA_MODIFIER", {
    apply: (
      rule: FormulaModifier,
      data: AutofillCellData,
      getters: Getters,
      direction: DIRECTION
    ) => {
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
      const sheetId = getters.getActiveSheetId();
      const content = getters.applyOffset(sheetId, data.content!, x, y);
      return {
        cellData: Object.assign({}, data, { content }),
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  });
