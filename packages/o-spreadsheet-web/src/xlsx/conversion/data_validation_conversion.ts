import { getDateCriterionFormattedValues, rangeReference } from "../../helpers";
import {
  DEFAULT_LOCALE,
  DataValidationDateCriterion,
  DataValidationRuleData,
  DateIsBetweenCriterion,
  DateIsNotBetweenCriterion,
} from "../../types";
import { XLSXDataValidation } from "../../types/xlsx";
import { WarningTypes, XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import {
  XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING,
  XLSX_DV_DECIMAL_OPERATOR_MAPPING,
} from "./conversion_maps";

export function convertDataValidationRules(
  xlsxDataValidations: XLSXDataValidation[],
  warningManager: XLSXImportWarningManager
): DataValidationRuleData[] {
  const dvRules: DataValidationRuleData[] = [];
  let dvId = 1;
  for (const dv of xlsxDataValidations) {
    if (!dv) {
      continue;
    }
    switch (dv.type) {
      case "time":
        warningManager.generateNotSupportedWarning(WarningTypes.TimeDataValidationNotSupported);
        break;
      case "textLength":
        warningManager.generateNotSupportedWarning(
          WarningTypes.TextLengthDataValidationNotSupported
        );
        break;
      case "whole":
        warningManager.generateNotSupportedWarning(
          WarningTypes.WholeNumberDataValidationNotSupported
        );
        break;
      case "decimal":
        const decimalRule = convertDecimalRule(dvId++, dv);
        dvRules.push(decimalRule);
        break;
      case "list":
        const listRule = convertListrule(dvId++, dv);
        dvRules.push(listRule);
        break;
      case "date":
        if (dv.operator === "notEqual") {
          warningManager.generateNotSupportedWarning(
            WarningTypes.NotEqualDateDataValidationNotSupported
          );
          break;
        }
        const dateRule = convertDateRule(dvId++, dv);
        dvRules.push(dateRule);
        break;
      case "custom":
        const customRule = convertCustomRule(dvId++, dv);
        dvRules.push(customRule);
        break;
    }
  }
  return dvRules;
}

function convertDecimalRule(id: number, dv: XLSXDataValidation): DataValidationRuleData {
  const values = [dv.formula1.toString()];
  if (dv.formula2) {
    values.push(dv.formula2.toString());
  }
  return {
    id: id.toString(),
    ranges: dv.sqref,
    isBlocking: dv.errorStyle !== "warning",
    criterion: {
      type: XLSX_DV_DECIMAL_OPERATOR_MAPPING[dv.operator],
      values,
    },
  };
}

function convertListrule(id: number, dv: XLSXDataValidation): DataValidationRuleData {
  const formula1 = dv.formula1.toString();
  const isRangeRule = rangeReference.test(formula1);
  return {
    id: id.toString(),
    ranges: dv.sqref,
    isBlocking: dv.errorStyle !== "warning",
    criterion: {
      type: isRangeRule ? "isValueInRange" : "isValueInList",
      values: isRangeRule ? [formula1] : formula1.replaceAll('"', "").split(","),
      displayStyle: "arrow",
    },
  };
}

function convertDateRule(id: number, dv: XLSXDataValidation): DataValidationRuleData {
  let criterion: DataValidationDateCriterion | DateIsBetweenCriterion | DateIsNotBetweenCriterion;
  const values = [dv.formula1.toString()];
  if (dv.formula2) {
    values.push(dv.formula2.toString());
    criterion = {
      type: XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING[dv.operator],
      values: getDateCriterionFormattedValues(values, DEFAULT_LOCALE),
    };
  } else {
    criterion = {
      type: XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING[dv.operator],
      values: getDateCriterionFormattedValues(values, DEFAULT_LOCALE),
      dateValue: "exactDate",
    };
  }
  return {
    id: id.toString(),
    ranges: dv.sqref,
    isBlocking: dv.errorStyle !== "warning",
    criterion: criterion,
  };
}

function convertCustomRule(id: number, dv: XLSXDataValidation): DataValidationRuleData {
  return {
    id: id.toString(),
    ranges: dv.sqref,
    isBlocking: dv.errorStyle !== "warning",
    criterion: {
      type: "customFormula",
      values: [`=${dv.formula1.toString()}`],
    },
  };
}
