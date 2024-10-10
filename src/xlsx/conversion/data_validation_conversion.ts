import { DataValidationRuleData } from "../../types";
import { XLSXDataValidation } from "../../types/xlsx";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import {
  XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING,
  XLSX_DV_DECIMAL_OPERATOR_TO_DV_TYPE_MAPPING,
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
      case "textLength":
      case "whole":
        // not supported
        continue;
      case "decimal":
        const decimalRule = convertDecimalRule(dvId++, dv);
        dvRules.push(decimalRule);
        break;
      case "list":
        const listRule = convertListrule(dvId++, dv);
        dvRules.push(listRule);
        break;
      case "date":
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
      type: XLSX_DV_DECIMAL_OPERATOR_TO_DV_TYPE_MAPPING[dv.operator] ?? "isBetween",
      values,
    },
  };
}

function convertListrule(id: number, dv: XLSXDataValidation): DataValidationRuleData {
  const values = [dv.formula1.toString()];
  if (dv.formula2) {
    values.push(dv.formula2.toString());
  }
  return {
    id: id.toString(),
    ranges: dv.sqref,
    isBlocking: dv.errorStyle !== "warning",
    criterion: {
      type: "isValueInRange",
      values: dv.formula1.split(","),
      displayStyle: "arrow",
    },
  };
}

function convertDateRule(id: number, dv: XLSXDataValidation): DataValidationRuleData {
  const values = [dv.formula1.toString()];
  if (dv.formula2) {
    values.push(dv.formula2.toString());
  }
  return {
    id: id.toString(),
    ranges: dv.sqref,
    isBlocking: dv.errorStyle !== "warning",
    criterion: {
      type: XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING[dv.operator] ?? "dateIsBetween",
      values: values,
    },
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

// function addDataValidationConversionWarnings(dv: XLSXDataValidation, warningManager: XLSXImportWarningManager) {}
