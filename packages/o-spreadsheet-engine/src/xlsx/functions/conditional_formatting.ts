import { ICON_SETS, IconSetType } from "../../components/icons/icons";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { colorNumberToHex } from "../../helpers/color";
import {
  CellIsRule,
  ColorScaleMidPointThreshold,
  ColorScaleRule,
  ColorScaleThreshold,
  ConditionalFormat,
  DataBarRule,
  IconSet,
  IconSetRule,
  IconThreshold,
  ThresholdType,
} from "../../types/conditional_formatting";
import { DEFAULT_LOCALE } from "../../types/locale";
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
      case "DataBarRule":
        cfNodes.push(addDataBarRule(cf, cf.rule));
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
  ruleAttributes.push(...cellRuleTypeAttributes(rule));
  if (operator.length) {
    ruleAttributes.push(["operator", operator]);
  }
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
    case "containsText":
      return [`NOT(ISERROR(SEARCH("${values[0]}",${firstCell})))`];
    case "notContainsText":
      return [`ISERROR(SEARCH("${values[0]}",${firstCell}))`];
    case "beginsWithText":
      return [`LEFT(${firstCell},LEN("${values[0]}"))="${values[0]}"`];
    case "endsWithText":
      return [`RIGHT(${firstCell},LEN("${values[0]}"))="${values[0]}"`];
    case "isEmpty":
      return [`LEN(TRIM(${firstCell}))=0`];
    case "isNotEmpty":
      return [`LEN(TRIM(${firstCell}))>0`];
    case "isEqual":
    case "isNotEqual":
    case "isGreaterThan":
    case "isGreaterOrEqualTo":
    case "isLessThan":
    case "isLessOrEqualTo":
      return [values[0]];
    case "customFormula":
      return values[0].startsWith("=") ? [values[0].slice(1)] : [values[0]];
    case "isBetween":
    case "isNotBetween":
      return [values[0], values[1]];
    case "dateIs":
      switch (rule.dateValue) {
        case "exactDate": {
          const value = values[0].startsWith("=")
            ? values[0].slice(1)
            : (parseLiteral(values[0], DEFAULT_LOCALE) || "").toString();
          const roundedValue = `ROUNDDOWN(${value},0)`;
          return [`AND(${firstCell}>=${roundedValue},${firstCell}<${roundedValue}+1)`];
        }
        case "today":
          return [`AND(${firstCell}>=TODAY(),${firstCell}<TODAY()+1)`];
        case "yesterday":
          return [`AND(${firstCell}>=TODAY()-1,${firstCell}<TODAY())`];
        case "tomorrow":
          return [`AND(${firstCell}>=TODAY()+1,${firstCell}<TODAY()+2)`];
        case "lastWeek":
          return [`AND(${firstCell}>=TODAY()-7,${firstCell}<TODAY())`];
        case "lastMonth":
          return [`AND(${firstCell}>=EDATE(TODAY(),-1),${firstCell}<TODAY())`];
        case "lastYear":
          return [`AND(${firstCell}>=EDATE(TODAY(),-12),${firstCell}<TODAY())`];
        case undefined:
          throw new Error("dateValue should be defined");
      }
    case "dateIsBefore":
    case "dateIsAfter":
    case "dateIsOnOrAfter":
    case "dateIsOnOrBefore":
      switch (rule.dateValue) {
        case "exactDate":
          return values[0].startsWith("=")
            ? [values[0].slice(1)]
            : [(parseLiteral(values[0], DEFAULT_LOCALE) || "").toString()];
        case "today":
          return ["TODAY()"];
        case "yesterday":
          return ["TODAY()-1"];
        case "tomorrow":
          return ["TODAY()+1"];
        case "lastWeek":
          return ["TODAY()-7"];
        case "lastMonth":
          return ["EDATE(TODAY(),-1)"];
        case "lastYear":
          return ["EDATE(TODAY(),-12)"];
        case undefined:
          throw new Error("dateValue should be defined");
      }
    case "top10":
      return [];
  }
}

function cellRuleTypeAttributes(rule: CellIsRule): XMLAttributes {
  const operator = convertOperator(rule.operator);
  switch (rule.operator) {
    case "containsText":
    case "notContainsText":
    case "beginsWithText":
    case "endsWithText":
      return [
        ["type", operator],
        ["text", rule.values[0]],
      ];
    case "isEmpty":
    case "isNotEmpty":
      return [["type", operator]];
    case "isEqual":
    case "isNotEqual":
    case "isGreaterThan":
    case "isGreaterOrEqualTo":
    case "isLessThan":
    case "isLessOrEqualTo":
    case "isBetween":
    case "isNotBetween":
    case "dateIsBefore":
    case "dateIsAfter":
    case "dateIsOnOrAfter":
    case "dateIsOnOrBefore":
      return [["type", "cellIs"]];
    case "dateIs":
    case "customFormula":
      return [["type", "expression"]];
    case "top10": {
      return [
        ["type", "top10"],
        ["rank", rule.values[0]],
        ["percent", rule.isPercent ? "1" : "0"],
        ["bottom", rule.isBottom ? "1" : "0"],
      ];
    }
  }
}

function addDataBarRule(cf: ConditionalFormat, rule: DataBarRule): XMLString {
  const ruleAttributes = commonCfAttributes(cf);
  ruleAttributes.push(["type", "dataBar"]);

  // TODO ATM we do not support min and max values, so to have the same result
  // in Excel, we export with min=0 and max=100
  return escapeXml/*xml*/ `
    <conditionalFormatting sqref="${cf.ranges.join(" ")}">
      <cfRule ${formatAttributes(ruleAttributes)}>
        <dataBar>
          <cfvo type="min" val="0"/>
          <cfvo type="max" val="100"/>
          <color rgb="${toXlsxHexColor(colorNumberToHex(rule.color))}"/>
        </dataBar>
      </cfRule>
    </conditionalFormatting>
  `;
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
    for (const position of ["minimum", "midpoint", "maximum"] as const) {
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
      colors.push([["rgb", toXlsxHexColor(colorNumberToHex(threshold.color))]]);
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
    for (const position of ["lowerInflectionPoint", "upperInflectionPoint"] as const) {
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
    const iconSetAttrs: XMLAttributes = [["iconSet", getIconSet(rule.icons)]];
    if (isIconSetReversed(rule.icons)) {
      iconSetAttrs.push(["reverse", "1"]);
    }
    conditionalFormats.push(escapeXml/*xml*/ `
      <conditionalFormatting sqref="${range}">
        <cfRule ${formatAttributes(ruleAttributes)}>
          <iconSet ${formatAttributes(iconSetAttrs)}>
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

function isIconSetReversed(iconSet: IconSet): boolean {
  const defaultIconSet = ICON_SETS[detectIconsType(iconSet)];
  return iconSet.upper === defaultIconSet.bad && iconSet.lower === defaultIconSet.good;
}

function getIconSet(iconSet: IconSet): ExcelIconSet {
  return XLSX_ICONSET_MAP[detectIconsType(iconSet)];
}

/**
 * Partial detection based on "upper" point only.
 * We support any arbitrary icon in the set, while excel doesn't allow
 * mixing icons from different types.
 */
function detectIconsType(iconSet: IconSet): IconSetType {
  const type =
    Object.keys(ICON_SETS).find((type: IconSetType) =>
      Object.values(ICON_SETS[type]).includes(iconSet.upper)
    ) || "dots";
  return type as IconSetType;
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
