import { ComponentConstructor } from "@odoo/owl";
import { Action, ActionSpec, createActions } from "../actions/action";
import { DateCriterionForm } from "../components/side_panel/criterion_form/date_criterion/date_criterion";
import { DoubleInputCriterionForm } from "../components/side_panel/criterion_form/double_input_criterion/double_input_criterion";
import { SingleInputCriterionForm } from "../components/side_panel/criterion_form/single_input_criterion/single_input_criterion";
import { ListCriterionForm } from "../components/side_panel/criterion_form/value_in_list_criterion/value_in_list_criterion";
import { ValueInRangeCriterionForm } from "../components/side_panel/criterion_form/value_in_range_criterion/value_in_range_criterion";
import { DataValidationCriterionType } from "../types";
import { criterionEvaluatorRegistry } from "./criterion_registry";
import { Registry } from "./registry";

export type CriterionCategory = "text" | "date" | "number" | "misc" | "list";
export const criterionCategoriesSequences: Record<CriterionCategory, number> = {
  list: 10,
  text: 20,
  date: 30,
  number: 40,
  misc: 50,
};

export type DataValidationCriterionItem = {
  type: DataValidationCriterionType;
  component: ComponentConstructor | undefined;
  sequence: number;
  category: CriterionCategory;
};

export const criterionComponentRegistry: Registry<DataValidationCriterionItem> = new Registry();

criterionComponentRegistry.add("containsText", {
  type: "containsText",
  component: SingleInputCriterionForm,
  category: "text",
  sequence: 10,
});

criterionComponentRegistry.add("notContainsText", {
  type: "notContainsText",
  component: SingleInputCriterionForm,
  category: "text",
  sequence: 20,
});

criterionComponentRegistry.add("isEqualText", {
  type: "isEqualText",
  component: SingleInputCriterionForm,
  category: "text",
  sequence: 30,
});

criterionComponentRegistry.add("isEmail", {
  type: "isEmail",
  component: undefined,
  category: "text",
  sequence: 40,
});

criterionComponentRegistry.add("isLink", {
  type: "isLink",
  component: undefined,
  category: "text",
  sequence: 50,
});

criterionComponentRegistry.add("dateIs", {
  type: "dateIs",
  component: DateCriterionForm,
  category: "date",
  sequence: 20,
});

criterionComponentRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  component: DateCriterionForm,
  category: "date",
  sequence: 30,
});

criterionComponentRegistry.add("dateIsOnOrBefore", {
  type: "dateIsOnOrBefore",
  component: DateCriterionForm,
  category: "date",
  sequence: 40,
});

criterionComponentRegistry.add("dateIsAfter", {
  type: "dateIsAfter",
  component: DateCriterionForm,
  category: "date",
  sequence: 50,
});

criterionComponentRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  component: DateCriterionForm,
  category: "date",
  sequence: 60,
});

criterionComponentRegistry.add("dateIsBetween", {
  type: "dateIsBetween",
  component: DoubleInputCriterionForm,
  category: "date",
  sequence: 70,
});

criterionComponentRegistry.add("dateIsNotBetween", {
  type: "dateIsNotBetween",
  component: DoubleInputCriterionForm,
  category: "date",
  sequence: 80,
});

criterionComponentRegistry.add("dateIsValid", {
  type: "dateIsValid",
  component: undefined,
  category: "date",
  sequence: 10,
});

criterionComponentRegistry.add("isEqual", {
  type: "isEqual",
  component: SingleInputCriterionForm,
  category: "number",
  sequence: 10,
});

criterionComponentRegistry.add("isNotEqual", {
  type: "isNotEqual",
  component: SingleInputCriterionForm,
  category: "number",
  sequence: 20,
});

criterionComponentRegistry.add("isGreaterThan", {
  type: "isGreaterThan",
  component: SingleInputCriterionForm,
  category: "number",
  sequence: 50,
});

criterionComponentRegistry.add("isGreaterOrEqualTo", {
  type: "isGreaterOrEqualTo",
  component: SingleInputCriterionForm,
  category: "number",
  sequence: 60,
});

criterionComponentRegistry.add("isLessThan", {
  type: "isLessThan",
  component: SingleInputCriterionForm,
  category: "number",
  sequence: 30,
});

criterionComponentRegistry.add("isLessOrEqualTo", {
  type: "isLessOrEqualTo",
  component: SingleInputCriterionForm,
  category: "number",
  sequence: 40,
});

criterionComponentRegistry.add("isBetween", {
  type: "isBetween",
  component: DoubleInputCriterionForm,
  category: "number",
  sequence: 70,
});

criterionComponentRegistry.add("isNotBetween", {
  type: "isNotBetween",
  component: DoubleInputCriterionForm,
  category: "number",
  sequence: 80,
});

criterionComponentRegistry.add("isBoolean", {
  type: "isBoolean",
  component: undefined,
  category: "misc",
  sequence: 10,
});

criterionComponentRegistry.add("isValueInList", {
  type: "isValueInList",
  component: ListCriterionForm,
  category: "list",
  sequence: 10,
});

criterionComponentRegistry.add("isValueInRange", {
  type: "isValueInRange",
  component: ValueInRangeCriterionForm,
  category: "list",
  sequence: 20,
});

criterionComponentRegistry.add("customFormula", {
  type: "customFormula",
  component: SingleInputCriterionForm,
  category: "misc",
  sequence: 20,
});

export function getCriterionMenuItems(
  callback: (type: DataValidationCriterionType) => void
): Action[] {
  const items = criterionComponentRegistry.getAll().sort((a, b) => {
    if (a.category === b.category) {
      return a.sequence - b.sequence;
    }
    return criterionCategoriesSequences[a.category] - criterionCategoriesSequences[b.category];
  });

  const actionSpecs: ActionSpec[] = items.map((item, index) => {
    const evaluator = criterionEvaluatorRegistry.get(item.type);
    return {
      name: evaluator.name,
      id: item.type,
      separator: item.category !== items[index + 1]?.category,
      execute: () => callback(item.type),
    };
  });
  return createActions(actionSpecs);
}
