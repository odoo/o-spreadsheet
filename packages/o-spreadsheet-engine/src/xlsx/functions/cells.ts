import { astToFormula } from "../../formulas/formula_formatter";
import { AST, ASTFuncall, ASTString, convertAstNodes, parse } from "../../formulas/parser";
import { functionRegistry } from "../../functions/function_registry";
import { isNumber } from "../../helpers";
import { mdyDateRegexp, parseDateTime, timeRegexp, ymdDateRegexp } from "../../helpers/dates";
import { formatValue } from "../../helpers/format/format";
import { CellValue } from "../../types/cells";
import { CellErrorType } from "../../types/errors";
import { Format } from "../../types/format";
import { DEFAULT_LOCALE } from "../../types/locale";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { FORCE_DEFAULT_ARGS_FUNCTIONS, NON_RETROCOMPATIBLE_FUNCTIONS } from "../constants";
import { getCellType, pushElement } from "../helpers/content_helpers";
import { escapeXml } from "../helpers/xml_helpers";

export function addFormula(
  formula: string | undefined,
  value: CellValue,
  formulaSpillRange: string
): {
  attrs: XMLAttributes;
  node: XMLString;
} {
  if (!formula) {
    return { attrs: [], node: escapeXml`` };
  }

  const type = getCellType(value);
  if (type === undefined) {
    return { attrs: [], node: escapeXml`` };
  }

  const attrs: XMLAttributes = [
    ["cm", "1"],
    ["t", type],
  ];
  const XlsxFormula = adaptFormulaToExcel(formula);

  const exportedValue = adaptFormulaValueToExcel(value);
  // We treat all formulas as array formulas (a simple formula
  // is an array formula that spills on only one cell) to avoid
  // trying to detect spilling sub-formulas which is not a trivial task.
  const node = escapeXml/*xml*/ `<f t="array" ref="${formulaSpillRange}">${XlsxFormula}</f><v>${exportedValue}</v>`;
  return { attrs, node };
}

export function addContent(
  content: string,
  sharedStrings: string[],
  forceString = false
): {
  attrs: XMLAttributes;
  node: XMLString;
} {
  let value: string | number = content;
  const attrs: XMLAttributes = [];

  const clearValue = value.trim().toUpperCase();
  if (!forceString && ["TRUE", "FALSE"].includes(clearValue)) {
    value = clearValue === "TRUE" ? "1" : "0";
    attrs.push(["t", "b"]);
  } else if (forceString || !isNumber(value, DEFAULT_LOCALE)) {
    value = pushElement(content, sharedStrings);
    attrs.push(["t", "s"]);
  }
  return { attrs, node: escapeXml/*xml*/ `<v>${value}</v>` };
}

export function adaptFormulaToExcel(formulaText: string): string {
  if (formulaText[0] === "=") {
    formulaText = formulaText.slice(1);
  }
  let ast: AST;
  try {
    ast = parse(formulaText);
  } catch (error) {
    return formulaText;
  }
  ast = convertAstNodes(ast, "STRING", convertDateFormat);
  ast = convertAstNodes(ast, "FUNCALL", (ast) => {
    ast = { ...ast, value: ast.value.toUpperCase() };
    ast = prependNonRetrocompatibleFunction(ast);
    ast = addMissingRequiredArgs(ast);
    return ast;
  });
  ast = convertAstNodes(ast, "REFERENCE", (ast) => {
    return ast.value === CellErrorType.InvalidReference ? { ...ast, value: "#REF!" } : ast;
  });
  return ast ? astToFormula(ast) : formulaText;
}

function adaptFormulaValueToExcel(formulaValue: CellValue): CellValue {
  return formulaValue === CellErrorType.InvalidReference ? "#REF!" : formulaValue;
}

/**
 * Some Excel function need required args that might not be mandatory in o-spreadsheet.
 * This adds those missing args.
 */
function addMissingRequiredArgs(ast: ASTFuncall): ASTFuncall {
  const formulaName = ast.value.toUpperCase();
  const args = ast.args;
  const exportDefaultArgs = FORCE_DEFAULT_ARGS_FUNCTIONS[formulaName];
  if (exportDefaultArgs) {
    const requiredArgs = functionRegistry.content[formulaName].args.filter((el) => !el.optional);
    const diffArgs = requiredArgs.length - ast.args.length;
    if (diffArgs) {
      // We know that we have at least 1 default Value missing
      for (let i = ast.args.length; i < requiredArgs.length; i++) {
        const currentDefaultArg = exportDefaultArgs[i - diffArgs];
        args.push({
          type: currentDefaultArg.type,
          value: currentDefaultArg.value,
          tokenEndIndex: 0,
          tokenStartIndex: 0,
        });
      }
    }
  }
  return { ...ast, args };
}

/**
 * Prepend function names that are not compatible with Old Excel versions
 */
function prependNonRetrocompatibleFunction(ast: ASTFuncall): ASTFuncall {
  const formulaName = ast.value.toUpperCase();
  return {
    ...ast,
    value: NON_RETROCOMPATIBLE_FUNCTIONS.includes(formulaName)
      ? `_xlfn.${formulaName}`
      : formulaName,
  };
}

/**
 * Convert strings that correspond to a date to the format YYYY-DD-MM
 */
function convertDateFormat(ast: ASTString): ASTString {
  const value = ast.value.replace(new RegExp('"', "g"), "");
  const internalDate = parseDateTime(value, DEFAULT_LOCALE);
  if (internalDate) {
    const format: Format[] = [];
    if (mdyDateRegexp.test(value) || ymdDateRegexp.test(value)) {
      format.push("yyyy-mm-dd");
    }
    if (timeRegexp.test(value)) {
      format.push("hh:mm:ss");
    }
    return {
      ...ast,
      value: formatValue({ value: internalDate.value, format: format.join(" ") }, DEFAULT_LOCALE),
    };
  } else {
    return { ...ast, value: ast.value.replace(/\\"/g, `""`) };
  }
}
