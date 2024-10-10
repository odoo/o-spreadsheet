import { toNumber } from "../../functions/helpers";
import { DataValidationRuleData, DEFAULT_LOCALE } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import {
  convertDateCriterionTypeToExcelOperator,
  convertDecimalCriterionTypeToExcelOperator,
} from "../helpers/content_helpers";
import { escapeXml, formatAttributes } from "../helpers/xml_helpers";
import { adaptFormulaToExcel } from "./cells";

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
      case "isValueInList":
        dvNodes.push(addListRule(dvRule));
        break;
      case "customFormula":
        dvNodes.push(addCustomFormulaRule(dvRule));
        break;
      default:
        console.warn(`Data validation ${dvRule.criterion.type} is not supported in xlsx.`);
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
  const operator = convertDateCriterionTypeToExcelOperator(dvRule.criterion.type);
  const attributes = commonDataValidationAttributes(dvRule);
  attributes.push(["type", "date"], ["operator", operator]);
  if (formula2) {
    return escapeXml/*xml*/ `
      <dataValidation ${formatAttributes(attributes)}>
        <formula1>${toNumber(formula1, DEFAULT_LOCALE)}</formula1>
        <formula2>${toNumber(formula2, DEFAULT_LOCALE)}</formula2>
      </dataValidation>
    `;
  }
  return escapeXml/*xml*/ `
    <dataValidation ${formatAttributes(attributes)}>
      <formula1>${toNumber(formula1, DEFAULT_LOCALE)}</formula1>
    </dataValidation>
  `;
}

function addDecimalRule(dvRule: DataValidationRuleData): XMLString {
  const rule = dvRule.criterion;
  const formula1 = adaptFormulaToExcel(rule.values[0]);
  const formula2 = rule.values[1] ? adaptFormulaToExcel(rule.values[1]) : undefined;
  const operator = convertDecimalCriterionTypeToExcelOperator(dvRule.criterion.type);
  const attributes = commonDataValidationAttributes(dvRule);
  attributes.push(["type", "decimal"], ["operator", operator]);
  if (formula2) {
    return escapeXml/*xml*/ `
      <dataValidation ${formatAttributes(attributes)}>
        <formula1>${formula1}</formula1>
        <formula2>${formula2}</formula2>
      </dataValidation>
    `;
  }
  return escapeXml/*xml*/ `
    <dataValidation ${formatAttributes(attributes)}>
      <formula1>${formula1}</formula1>
    </dataValidation>
  `;
}

function addListRule(dvRule: DataValidationRuleData): XMLString {
  const rule = dvRule.criterion;
  const formula1 =
    dvRule.criterion.type === "isValueInRange"
      ? adaptFormulaToExcel(rule.values[0])
      : `"${rule.values.join(",")}"`;
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
