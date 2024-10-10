import { DataValidationRuleData } from "../../types";
import {
  XLSXDataValidationCompatibleDateCriterionType,
  XLSXDataValidationCompatibleDecimalCriterionType,
  XMLAttributes,
  XMLString,
} from "../../types/xlsx";
import {
  convertDateCriterionTypeToExcelOperator,
  convertDecimalCriterionTypeToExcelOperator,
} from "../helpers/content_helpers";
import { escapeXml, formatAttributes } from "../helpers/xml_helpers";
import { adaptFormulaToExcel, toSerialDate } from "./cells";

export function addDataValidationRules(dataValidationRules: DataValidationRuleData[]): XMLString[] {
  const dvRulesCount = dataValidationRules.length;
  if (dvRulesCount === 0) {
    return [];
  }
  const dvNodes: XMLString[] = [new XMLString(`<dataValidations count="${dvRulesCount}">`)];
  for (const dvRule of dataValidationRules) {
    switch (dvRule.criterion.type) {
      case "dateIs":
      case "dateIsBefore":
      case "dateIsOnOrBefore":
      case "dateIsAfter":
      case "dateIsOnOrAfter":
      case "dateIsBetween":
      case "dateIsNotBetween":
        dvNodes.push(addDateRule(dvRule));
        break;
      case "isEqual":
      case "isNotEqual":
      case "isGreaterThan":
      case "isGreaterOrEqualTo":
      case "isLessThan":
      case "isLessOrEqualTo":
      case "isBetween":
      case "isNotBetween":
        dvNodes.push(addDecimalRule(dvRule));
        break;
      case "isValueInRange":
        dvNodes.push(addListRule(dvRule));
        break;
      case "customFormula":
        dvNodes.push(addCustomFormulaRule(dvRule));
        break;
      default:
        // @ts-ignore Typescript knows it will never happen at compile time
        console.warn(`Data validation ${dvRule.criterion.type} not implemented.`);
        break;
    }
  }
  dvNodes.push(new XMLString("</dataValidations>"));
  return dvNodes;
}

function addDateRule(dvRule: DataValidationRuleData): XMLString {
  const rule = dvRule.criterion;
  const formula1 = adaptFormulaToExcel(rule.values[0]);
  const formula2 = rule.values[1] ? adaptFormulaToExcel(rule.values[1]) : undefined;
  const operator = convertDateCriterionTypeToExcelOperator(
    dvRule.criterion.type as XLSXDataValidationCompatibleDateCriterionType
  );
  const attributes = commonDataValidationAttributes(dvRule);
  attributes.push(["type", "date"], ["operator", operator]);
  const formula2SerialValue = formula2 ? toSerialDate(formula2) : "";
  return escapeXml/*xml*/ `
    <dataValidation ${formatAttributes(attributes)}>
      <formula1>${toSerialDate(formula1)}</formula1>
      <formula2>${formula2SerialValue}</formula2>
    </dataValidation>
  `;
}

function addDecimalRule(dvRule: DataValidationRuleData): XMLString {
  const rule = dvRule.criterion;
  const formula1 = adaptFormulaToExcel(rule.values[0]);
  const formula2 = rule.values[1] ? adaptFormulaToExcel(rule.values[1]) : undefined;
  const operator = convertDecimalCriterionTypeToExcelOperator(
    dvRule.criterion.type as XLSXDataValidationCompatibleDecimalCriterionType
  );
  const attributes = commonDataValidationAttributes(dvRule);
  attributes.push(["type", "decimal"], ["operator", operator]);
  return escapeXml/*xml*/ `
    <dataValidation ${formatAttributes(attributes)}>
      <formula1>${formula1}</formula1>
      <formula2>${formula2}</formula2>
    </dataValidation>
  `;
}

function addListRule(dvRule: DataValidationRuleData): XMLString {
  const rule = dvRule.criterion;
  const formula1 = adaptFormulaToExcel(rule.values[0]);
  const attributes = commonDataValidationAttributes(dvRule);
  attributes.push(["type", "list"]);
  return escapeXml/*xml*/ `
    <dataValidation ${formatAttributes(attributes)}>
      <formula1>${formula1}</formula1>
    </dataValidation>
  `;
}

function addCustomFormulaRule(dvRule: DataValidationRuleData): XMLString {
  const rule = dvRule.criterion;
  const formula1 = adaptFormulaToExcel(rule.values[0]);
  const attributes = commonDataValidationAttributes(dvRule);
  attributes.push(["type", "custom"]);
  return escapeXml/*xml*/ `
    <dataValidation ${formatAttributes(attributes)}>
      <formula1>${formula1}</formula1>
    </dataValidation>
  `;
}

function commonDataValidationAttributes(dvRule: DataValidationRuleData): XMLAttributes {
  return [
    ["allowBlank", "1"],
    ["showInputMessage", "1"],
    ["showErrorMessage", "1"],
    ["errorStyle", !dvRule.isBlocking ? "warning" : ""],
    ["sqref", dvRule.ranges.join(" ")],
  ];
}
