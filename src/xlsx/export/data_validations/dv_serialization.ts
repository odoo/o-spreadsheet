import { toNumber } from "../../../functions/helpers";
import { DEFAULT_LOCALE } from "../../../types/locale";
import { DataValidationRuleData } from "../../../types/workbook_data";
import {
  XLSXDataValidationDateOperatorType,
  XLSXDataValidationOperatorType,
  XMLAttributes,
  XMLString,
} from "../../../types/xlsx";
import {
  XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING,
  XLSX_DV_DECIMAL_OPERATOR_MAPPING,
} from "../../conversion/conversion_maps";
import { adaptFormulaToExcel } from "../cells/cell_construction";
import { escapeXml, formatAttributes } from "../xlsx_xml";

/**
 * Phase-2: emit `<dataValidations>` block for a sheet.
 *
 * Data-validation export still reads directly from the internal
 * `DataValidationRuleData[]` — a dedicated `XLSXDataValidation`
 * intermediate wouldn't buy anything here since the internal shape is
 * already nearly a 1:1 map to the XML.
 */
export function serializeDataValidations(
  dataValidationRules: DataValidationRuleData[]
): XMLString[] {
  if (dataValidationRules.length === 0) {
    return [];
  }
  const nodes: XMLString[] = [
    new XMLString(`<dataValidations count="${dataValidationRules.length}">`),
  ];
  for (const dvRule of dataValidationRules) {
    switch (dvRule.criterion.type) {
      case "dateIs":
      case "dateIsBefore":
      case "dateIsOnOrBefore":
      case "dateIsAfter":
      case "dateIsOnOrAfter":
      case "dateIsBetween":
      case "dateIsNotBetween":
        nodes.push(renderDateRule(dvRule));
        break;
      case "isEqual":
      case "isNotEqual":
      case "isGreaterThan":
      case "isGreaterOrEqualTo":
      case "isLessThan":
      case "isLessOrEqualTo":
      case "isBetween":
      case "isNotBetween":
        nodes.push(renderDecimalRule(dvRule));
        break;
      case "isValueInRange":
      case "isValueInList":
        nodes.push(renderListRule(dvRule));
        break;
      case "customFormula":
        nodes.push(renderCustomFormulaRule(dvRule));
        break;
      default:
        console.warn(`Data validation ${dvRule.criterion.type} is not supported in xlsx.`);
        break;
    }
  }
  nodes.push(new XMLString("</dataValidations>"));
  return nodes;
}

function renderDateRule(dvRule: DataValidationRuleData): XMLString {
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

function renderDecimalRule(dvRule: DataValidationRuleData): XMLString {
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

function renderListRule(dvRule: DataValidationRuleData): XMLString {
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

function renderCustomFormulaRule(dvRule: DataValidationRuleData): XMLString {
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

function convertDecimalCriterionTypeToExcelOperator(operator: string) {
  return Object.keys(XLSX_DV_DECIMAL_OPERATOR_MAPPING).find(
    (key) => XLSX_DV_DECIMAL_OPERATOR_MAPPING[key] === operator
  ) as XLSXDataValidationOperatorType;
}

function convertDateCriterionTypeToExcelOperator(operator: string) {
  return Object.keys(XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING).find(
    (key) => XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING[key] === operator
  ) as XLSXDataValidationDateOperatorType;
}
