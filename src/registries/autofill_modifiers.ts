import {
  Getters,
  CellData,
  DIRECTION,
  AutofillModifier,
  IncrementModifier,
  CopyModifier,
  FormulaModifier,
} from "../types/index";
import { Registry } from "../registry";

/**
 * An AutofillModifierImplementation is used to describe how to handle a
 * AutofillModifier.
 */
interface AutofillModifierImplementation {
  apply: (
    rule: AutofillModifier,
    data: CellData,
    getters: Getters,
    direction: DIRECTION
  ) => CellData;
}

export const autofillModifiersRegistry = new Registry<AutofillModifierImplementation>();

autofillModifiersRegistry
  .add("INCREMENT_MODIFIER", {
    apply: (rule: IncrementModifier, data: CellData) => {
      rule.current += rule.increment;
      return Object.assign({}, data, {
        content: (parseFloat(data.content!) + rule.current).toString(),
      });
    },
  })
  .add("COPY_MODIFIER", {
    apply: (rule: CopyModifier, data: CellData) => data,
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
      return Object.assign({}, data, {
        content: getters.applyOffset(data.content!, x, y),
      });
    },
  });
