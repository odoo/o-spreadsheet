import { UID } from "..";
import { isMultipleElementMatrix, toScalar } from "../functions/helper_matrices";
import { criterionEvaluatorRegistry } from "../registries/criterion_registry";
import { Getters } from "../types/getters";
import { DEFAULT_LOCALE } from "../types/locale";
import { parseLiteral } from "./cells/cell_evaluation";
import { toLowerCase } from "./text_helper";

export function dataPassFilter(getters: Getters, sheetId: UID, data, filter): boolean {
  if (filter.filterType === "values") {
    const filteredValues = filter.hiddenValues?.map(toLowerCase);
    if (!filteredValues) return true;
    const filteredValuesSet = new Set(filteredValues);
    if (filteredValuesSet.has(data.formattedValue.toLowerCase())) {
      return false;
    }
  } else {
    if (filter.type === "none") return true;
    const evaluator = criterionEvaluatorRegistry.get(filter.type);

    const evaluatedCriterionValues = filter.values.map((value) => {
      if (!value.startsWith("=")) {
        return parseLiteral(value, DEFAULT_LOCALE);
      }
      return getters.evaluateFormula(sheetId, value) ?? "";
    });
    if (evaluatedCriterionValues.some(isMultipleElementMatrix)) {
      return true;
    }
    const evaluatedCriterion = {
      type: filter.type,
      values: evaluatedCriterionValues.map(toScalar),
      dateValue: filter.dateValue,
    };
    if (!evaluator.isValueValid(data.value, evaluatedCriterion, getters, sheetId)) {
      return false;
    }
  }
  return true;
}
