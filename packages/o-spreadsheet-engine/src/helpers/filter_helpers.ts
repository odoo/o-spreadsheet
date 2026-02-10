import { UID } from "..";
import { isMultipleElementMatrix, toScalar } from "../functions/helper_matrices";
import { criterionEvaluatorRegistry } from "../registries/criterion_registry";
import { Getters } from "../types/getters";
import { DEFAULT_LOCALE } from "../types/locale";
import { DataFilterValue } from "../types/table";
import { parseLiteral } from "./cells/cell_evaluation";
import { FieldValue } from "./pivot/spreadsheet_pivot/data_entry_spreadsheet_pivot";
import { toTrimmedLowerCase } from "./text_helper";

export function isValueFiltered(
  getters: Getters,
  sheetId: UID,
  data: FieldValue,
  filter: DataFilterValue,
  preComputedCriterion?: unknown
): boolean {
  if (filter.filterType === "values") {
    const filteredValues = filter.hiddenValues?.map(toTrimmedLowerCase);
    if (!filteredValues) {
      return false;
    }
    const filteredValuesSet = new Set(filteredValues);
    if (filteredValuesSet.has(toTrimmedLowerCase(data.formattedValue))) {
      return true;
    }
  } else {
    if (filter.type === "none") {
      return false;
    }
    const evaluator = criterionEvaluatorRegistry.get(filter.type);

    const evaluatedCriterionValues = filter.values.map((value) => {
      if (!value.startsWith("=")) {
        return parseLiteral(value, DEFAULT_LOCALE);
      }
      return getters.evaluateFormula(sheetId, value) ?? "";
    });
    if (evaluatedCriterionValues.some(isMultipleElementMatrix)) {
      return false;
    }
    const evaluatedCriterion = {
      type: filter.type,
      values: evaluatedCriterionValues.map(toScalar),
      dateValue: filter.dateValue,
    };
    if (!evaluator.isValueValid(data.value, evaluatedCriterion, preComputedCriterion)) {
      return true;
    }
  }
  return false;
}
