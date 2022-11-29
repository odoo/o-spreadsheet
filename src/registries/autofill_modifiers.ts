import { Registry } from "../registry";
import {
  AutofillModifier,
  CellData,
  CopyModifier,
  DIRECTION,
  FormulaModifier,
  Getters,
  IncrementModifier,
  Tooltip,
} from "../types/index";

/**
 * An AutofillModifierImplementation is used to describe how to handle a
 * AutofillModifier.
 */
export interface AutofillModifierImplementation {
  apply: (
    rule: AutofillModifier,
    data: CellData,
    getters: Getters,
    direction: DIRECTION
  ) => { cellData: CellData; tooltip?: Tooltip };
}

export const autofillModifiersRegistry = new Registry<AutofillModifierImplementation>();

autofillModifiersRegistry
  .add("INCREMENT_MODIFIER", {
    apply: (rule: IncrementModifier, data: CellData) => {
      rule.current += rule.increment;
      const content = (parseFloat(data.content!) + rule.current).toString();
      return {
        cellData: Object.assign({}, data, { content }),
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  })
  .add("COPY_MODIFIER", {
    apply: (rule: CopyModifier, data: CellData) => {
      return {
        cellData: data,
        tooltip: data.content ? { props: { content: data.content } } : undefined,
      };
    },
  })
  .add("FORMULA_MODIFIER", {
    apply: (rule: FormulaModifier, data: CellData, getters: Getters, direction: DIRECTION) => {
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
      const content = getters.applyOffset(data.content!, x, y);
      return {
        cellData: Object.assign({}, data, { content }),
        tooltip: content ? { props: { content } } : undefined,
      };
    },
  });
