import { colorNumberString } from "../../helpers";
import {
  CellIsRule,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  IconSet,
  IconSetRule,
  IconThreshold,
  ThresholdType,
} from "../../types";
import { ExcelIconSet, XLSXDxf, XMLAttributes, XMLString } from "../../types/xlsx";
import { XLSX_ICONSET_MAP } from "../constants";
import { toXlsxHexColor } from "../helpers/colors";
import { convertOperator, pushElement } from "../helpers/content_helpers";
import { escapeXml, formatAttributes, joinXmlNodes } from "../helpers/xml_helpers";
import { adaptFormulaToExcel } from "./cells";

type CFExcelPointType = "formula" | "max" | "min" | "num" | "percent" | "percentile";

export function addConditionalFormatting(
  dxfs: XLSXDxf[],
  conditionalFormats: ConditionalFormat[]
): XMLString[] {
  // Conditional Formats
  const cfNodes: XMLString[] = [];
  for (const cf of conditionalFormats) {
    // Special case for each type of rule: might be better to extract that logic in dedicated functions
    switch (cf.rule.type) {
      case "CellIsRule":
        cfNodes.push(addCellIsRule(cf, cf.rule, dxfs));
        break;
      case "ColorScaleRule":
        cfNodes.push(addColorScaleRule(cf, cf.rule));
        break;
      case "IconSetRule":
        cfNodes.push(addIconSetRule(cf, cf.rule));
        break;
      default:
        // @ts-ignore Typescript knows it will never happen at compile time
        console.warn(`Conditional formatting ${cf.rule.type} not implemented`);
        break;
    }
  }
  return cfNodes;
}

// ----------------------
//         RULES
// ----------------------

function addCellIsRule(cf: ConditionalFormat, rule: CellIsRule, dxfs: XLSXDxf[]): XMLString {
  const ruleAttributes = commonCfAttributes(cf);
  const operator = convertOperator(rule.operator);
  ruleAttributes.push(...cellRuleTypeAttributes(rule), ["operator", operator]);
  const formulas = cellRuleFormula(cf.ranges, rule).map(
    (formula) => escapeXml/*xml*/ `<formula>${formula}</formula>`
  );
  const dxf: XLSXDxf = {
    font: {
      color: { rgb: rule.style.textColor },
      bold: rule.style.bold,
      italic: rule.style.italic,
      strike: rule.style.strikethrough,
      underline: rule.style.underline,
    },
  };
  if (rule.style.fillColor) {
    dxf.fill = { fgColor: { rgb: rule.style.fillColor } };
  }
  ruleAttributes.push(["dxfId", pushElement(dxf, dxfs)]);

  return escapeXml/*xml*/ `
    <conditionalFormatting sqref="${cf.ranges.join(" ")}">
      <cfRule ${formatAttributes(ruleAttributes)}>
        ${joinXmlNodes(formulas)}
      </cfRule>
    </conditionalFormatting>
  `;
}

function cellRuleFormula(ranges: string[], rule: CellIsRule): string[] {
  const firstCell = ranges[0].split(":")[0];
  const values = rule.values;
  switch (rule.operator) {
    case "ContainsText":
      return [`NOT(ISERROR(SEARCH("${values[0]}",${firstCell})))`];
    case "NotContains":
      return [`ISERROR(SEARCH("${values[0]}",${firstCell}))`];
    case "BeginsWith":
      return [`LEFT(${firstCell},LEN("${values[0]}"))="${values[0]}"`];
    case "EndsWith":
      return [`RIGHT(${firstCell},LEN("${values[0]}"))="${values[0]}"`];
    case "IsEmpty":
      return [`LEN(TRIM(${firstCell}))=0`];
    case "IsNotEmpty":
      return [`LEN(TRIM(${firstCell}))>0`];
    case "Equal":
    case "NotEqual":
    case "GreaterThan":
    case "GreaterThanOrEqual":
    case "LessThan":
    case "LessThanOrEqual":
      return [values[0]];
    case "Between":
    case "NotBetween":
      return [values[0], values[1]];
  }
}

function cellRuleTypeAttributes(rule: CellIsRule): XMLAttributes {
  const operator = convertOperator(rule.operator);
  switch (rule.operator) {
    case "ContainsText":
    case "NotContains":
    case "BeginsWith":
    case "EndsWith":
      return [
        ["type", operator],
        ["text", rule.values[0]],
      ];
    case "IsEmpty":
    case "IsNotEmpty":
      return [["type", operator]];
    case "Equal":
    case "NotEqual":
    case "GreaterThan":
    case "GreaterThanOrEqual":
    case "LessThan":
    case "LessThanOrEqual":
    case "Between":
    case "NotBetween":
      return [["type", "cellIs"]];
  }
}

function addColorScaleRule(cf: ConditionalFormat, rule: ColorScaleRule): XMLString {
  const ruleAttributes = commonCfAttributes(cf);
  ruleAttributes.push(["type", "colorScale"]);
  /** mimic our flow:
   * for a given ColorScale CF, each range of the "ranges set" has its own behaviour.
   */
  const conditionalFormats: XMLString[] = [];
  for (const range of cf.ranges) {
    const cfValueObject: XMLAttributes[] = [];
    const colors: XMLAttributes[] = [];

    let canExport = true;
    for (let position of ["minimum", "midpoint", "maximum"] as const) {
      const threshold: ColorScaleThreshold | ColorScaleMidPointThreshold | undefined =
        rule[position];
      if (!threshold) {
        // pass midpoint if not defined
        continue;
      }
      if (threshold.type === "formula") {
        canExport = false;
        continue;
      }

      cfValueObject.push(thresholdAttributes(threshold, position));
      colors.push([["rgb", toXlsxHexColor(colorNumberString(threshold.color))]]);
    }
    if (!canExport) {
      console.warn(
        "Conditional formats with formula rules are not supported at the moment. The rule is therefore skipped."
      );
      continue;
    }
    const cfValueObjectNodes = cfValueObject.map(
      (attrs) => escapeXml/*xml*/ `<cfvo ${formatAttributes(attrs)}/>`
    );
    const cfColorNodes = colors.map(
      (attrs) => escapeXml/*xml*/ `<color ${formatAttributes(attrs)}/>`
    );
    conditionalFormats.push(escapeXml/*xml*/ `
      <conditionalFormatting sqref="${range}">
        <cfRule ${formatAttributes(ruleAttributes)}>
          <colorScale>
            ${joinXmlNodes(cfValueObjectNodes)}
            ${joinXmlNodes(cfColorNodes)}
          </colorScale>
        </cfRule>
      </conditionalFormatting>
    `);
  }

  return joinXmlNodes(conditionalFormats);
}

function addIconSetRule(cf: ConditionalFormat, rule: IconSetRule): XMLString {
  const ruleAttributes = commonCfAttributes(cf);
  ruleAttributes.push(["type", "iconSet"]);
  /** mimic our flow:
   * for a given IconSet CF, each range of the "ranges set" has its own behaviour.
   */
  const conditionalFormats: XMLString[] = [];
  for (const range of cf.ranges) {
    const cfValueObject: XMLAttributes[] = [
      // It looks like they always want 3 cfvo and they add a dummy entry
      [
        ["type", "percent"],
        ["val", 0],
      ],
    ];
    let canExport = true;
    for (let position of ["lowerInflectionPoint", "upperInflectionPoint"] as const) {
      if (rule[position].type === "formula") {
        canExport = false;
        continue;
      }
      const threshold: IconThreshold = rule[position];
      cfValueObject.push([
        ...thresholdAttributes(threshold, position),
        ["gte", threshold.operator === "ge" ? "1" : "0"],
      ]);
    }
    if (!canExport) {
      console.warn(
        "Conditional formats with formula rules are not supported at the moment. The rule is therefore skipped."
      );
      continue;
    }
    const cfValueObjectNodes = cfValueObject.map(
      (attrs) => escapeXml/*xml*/ `<cfvo ${formatAttributes(attrs)} />`
    );
    conditionalFormats.push(escapeXml/*xml*/ `
      <conditionalFormatting sqref="${range}">
        <cfRule ${formatAttributes(ruleAttributes)}>
          <iconSet iconSet="${getIconSet(rule.icons)}">
            ${joinXmlNodes(cfValueObjectNodes)}
          </iconSet>
        </cfRule>
      </conditionalFormatting>
    `);
  }

  return joinXmlNodes(conditionalFormats);
}

// ----------------------
//         MISC
// ----------------------

function commonCfAttributes(cf: ConditionalFormat): XMLAttributes {
  return [
    ["priority", 1],
    ["stopIfTrue", cf.stopIfTrue ? 1 : 0],
  ];
}

function getIconSet(iconSet: IconSet): ExcelIconSet {
  return XLSX_ICONSET_MAP[
    Object.keys(XLSX_ICONSET_MAP).find((key) => iconSet.upper.toLowerCase().startsWith(key)) ||
      "dots"
  ];
}

function thresholdAttributes(
  threshold: IconThreshold | ColorScaleThreshold | ColorScaleMidPointThreshold,
  position: "minimum" | "midpoint" | "maximum" | "lowerInflectionPoint" | "upperInflectionPoint"
): XMLAttributes {
  const type = getExcelThresholdType(threshold.type, position);
  const attrs: XMLAttributes = [["type", type]];
  if (type !== "min" && type !== "max") {
    // what if the formula is not correct
    // references cannot be relative :/
    let val = threshold.value!;
    if (type === "formula") {
      try {
        // Relative references are not supported in formula
        val = adaptFormulaToExcel(threshold.value!);
      } catch (error) {
        val = threshold.value!;
      }
    }
    attrs.push(["val", val]); // value is undefined only for type="value")
  }
  return attrs;
}

/**
 * This function adapts our Threshold types to their Excel equivalents.
 *
 * if type === "value" ,then we must replace it by min or max according to the position
 * if type === "number", then it becomes num
 * if type === "percentage", it becomes "percent"
 * rest of the time, the type is unchanged
 */
function getExcelThresholdType(
  type: ThresholdType,
  position: "minimum" | "midpoint" | "maximum" | "lowerInflectionPoint" | "upperInflectionPoint"
): CFExcelPointType {
  switch (type) {
    case "value":
      return position === "minimum" ? "min" : "max";
    case "number":
      return "num";
    case "percentage":
      return "percent";
    default:
      return type;
  }
}
