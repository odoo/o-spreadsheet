import { ComponentConstructor } from "@odoo/owl";
import { Action, ActionSpec, createActions } from "../../../actions/action";
import { dataValidationEvaluatorRegistry } from "../../../registries/data_validation_registry";
import { Registry } from "../../../registries/registry";
import { DataValidationCriterionType } from "../../../types";
import { DataValidationDateCriterionForm } from "./dv_criterion_form/dv_date_criterion/dv_date_criterion";
import { DataValidationDoubleInputCriterionForm } from "./dv_criterion_form/dv_double_input_criterion/dv_double_input_criterion";
import { DataValidationSingleInputCriterionForm } from "./dv_criterion_form/dv_single_input_criterion/dv_single_input_criterion";
import { DataValidationListCriterionForm } from "./dv_criterion_form/dv_value_in_list_criterion/dv_value_in_list_criterion";
import { DataValidationValueInRangeCriterionForm } from "./dv_criterion_form/dv_value_in_range_criterion/dv_value_in_range_criterion";

export type DVCriterionCategory = "text" | "date" | "number" | "misc" | "list";
export const dvCriterionCategoriesSequences: Record<DVCriterionCategory, number> = {
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
  category: DVCriterionCategory;
};

export const dataValidationPanelCriteriaRegistry: Registry<DataValidationCriterionItem> =
  new Registry();

dataValidationPanelCriteriaRegistry.add("textContains", {
  type: "textContains",
  component: DataValidationSingleInputCriterionForm,
  category: "text",
  sequence: 10,
});

dataValidationPanelCriteriaRegistry.add("textNotContains", {
  type: "textNotContains",
  component: DataValidationSingleInputCriterionForm,
  category: "text",
  sequence: 20,
});

dataValidationPanelCriteriaRegistry.add("textIs", {
  type: "textIs",
  component: DataValidationSingleInputCriterionForm,
  category: "text",
  sequence: 30,
});

dataValidationPanelCriteriaRegistry.add("textIsEmail", {
  type: "textIsEmail",
  component: undefined,
  category: "text",
  sequence: 40,
});

dataValidationPanelCriteriaRegistry.add("textIsLink", {
  type: "textIsLink",
  component: undefined,
  category: "text",
  sequence: 50,
});

dataValidationPanelCriteriaRegistry.add("dateIs", {
  type: "dateIs",
  component: DataValidationDateCriterionForm,
  category: "date",
  sequence: 20,
});

dataValidationPanelCriteriaRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  component: DataValidationDateCriterionForm,
  category: "date",
  sequence: 30,
});

dataValidationPanelCriteriaRegistry.add("dateIsOnOrBefore", {
  type: "dateIsOnOrBefore",
  component: DataValidationDateCriterionForm,
  category: "date",
  sequence: 40,
});

dataValidationPanelCriteriaRegistry.add("dateIsAfter", {
  type: "dateIsAfter",
  component: DataValidationDateCriterionForm,
  category: "date",
  sequence: 50,
});

dataValidationPanelCriteriaRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  component: DataValidationDateCriterionForm,
  category: "date",
  sequence: 60,
});

dataValidationPanelCriteriaRegistry.add("dateIsBetween", {
  type: "dateIsBetween",
  component: DataValidationDoubleInputCriterionForm,
  category: "date",
  sequence: 70,
});

dataValidationPanelCriteriaRegistry.add("dateIsNotBetween", {
  type: "dateIsNotBetween",
  component: DataValidationDoubleInputCriterionForm,
  category: "date",
  sequence: 80,
});

dataValidationPanelCriteriaRegistry.add("dateIsValid", {
  type: "dateIsValid",
  component: undefined,
  category: "date",
  sequence: 10,
});

dataValidationPanelCriteriaRegistry.add("isEqual", {
  type: "isEqual",
  component: DataValidationSingleInputCriterionForm,
  category: "number",
  sequence: 10,
});

dataValidationPanelCriteriaRegistry.add("isNotEqual", {
  type: "isNotEqual",
  component: DataValidationSingleInputCriterionForm,
  category: "number",
  sequence: 20,
});

dataValidationPanelCriteriaRegistry.add("isGreaterThan", {
  type: "isGreaterThan",
  component: DataValidationSingleInputCriterionForm,
  category: "number",
  sequence: 50,
});

dataValidationPanelCriteriaRegistry.add("isGreaterOrEqualTo", {
  type: "isGreaterOrEqualTo",
  component: DataValidationSingleInputCriterionForm,
  category: "number",
  sequence: 60,
});

dataValidationPanelCriteriaRegistry.add("isLessThan", {
  type: "isLessThan",
  component: DataValidationSingleInputCriterionForm,
  category: "number",
  sequence: 30,
});

dataValidationPanelCriteriaRegistry.add("isLessOrEqualTo", {
  type: "isLessOrEqualTo",
  component: DataValidationSingleInputCriterionForm,
  category: "number",
  sequence: 40,
});

dataValidationPanelCriteriaRegistry.add("isBetween", {
  type: "isBetween",
  component: DataValidationDoubleInputCriterionForm,
  category: "number",
  sequence: 70,
});

dataValidationPanelCriteriaRegistry.add("isNotBetween", {
  type: "isNotBetween",
  component: DataValidationDoubleInputCriterionForm,
  category: "number",
  sequence: 80,
});

dataValidationPanelCriteriaRegistry.add("isBoolean", {
  type: "isBoolean",
  component: undefined,
  category: "misc",
  sequence: 10,
});

dataValidationPanelCriteriaRegistry.add("isValueInList", {
  type: "isValueInList",
  component: DataValidationListCriterionForm,
  category: "list",
  sequence: 10,
});

dataValidationPanelCriteriaRegistry.add("isValueInRange", {
  type: "isValueInRange",
  component: DataValidationValueInRangeCriterionForm,
  category: "list",
  sequence: 20,
});

dataValidationPanelCriteriaRegistry.add("customFormula", {
  type: "customFormula",
  component: DataValidationSingleInputCriterionForm,
  category: "misc",
  sequence: 20,
});

export function getDataValidationCriterionMenuItems(
  callback: (type: DataValidationCriterionType) => void
): Action[] {
  const items = dataValidationPanelCriteriaRegistry.getAll().sort((a, b) => {
    if (a.category === b.category) {
      return a.sequence - b.sequence;
    }
    return dvCriterionCategoriesSequences[a.category] - dvCriterionCategoriesSequences[b.category];
  });

  const actionSpecs: ActionSpec[] = items.map((item, index) => {
    const evaluator = dataValidationEvaluatorRegistry.get(item.type);
    return {
      name: evaluator.name,
      id: item.type,
      separator: item.category !== items[index + 1]?.category,
      execute: () => callback(item.type),
    };
  });
  return createActions(actionSpecs);
}
