import { tokenize } from "../../formulas";
import {
  AST,
  ASTFuncall,
  ASTString,
  astToFormula,
  convertAstNodes,
  parse,
} from "../../formulas/parser";
import { functionRegistry } from "../../functions";
import { isNumber } from "../../helpers";
import {
  formatDateTime,
  mdyDateRegexp,
  parseDateTime,
  timeRegexp,
  ymdDateRegexp,
} from "../../helpers/dates";
import { ExcelCellData } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { FORCE_DEFAULT_ARGS_FUNCTIONS, NON_RETROCOMPATIBLE_FUNCTIONS } from "../constants";
import { getCellType, pushElement } from "../helpers/content_helpers";
import { escapeXml } from "../helpers/xml_helpers";

export function addFormula(cell: ExcelCellData): {
  attrs: XMLAttributes;
  node: XMLString;
} {
  const formula = cell.content!;
  const functions = functionRegistry.content;
  const tokens = tokenize(formula);

  const attrs: XMLAttributes = [];
  let node = escapeXml``;

  const isExported = tokens
    .filter((tk) => tk.type === "FUNCTION")
    .every((tk) => functions[tk.value.toUpperCase()].isExported);

  if (isExported) {
    let cycle = escapeXml``;
    const XlsxFormula = adaptFormulaToExcel(formula);
    // hack for cycles : if we don't set a value (be it 0 or #VALUE!), it will appear as invisible on excel,
    // Making it very hard for the client to find where the recursion is.
    if (cell.value === "#CYCLE") {
      attrs.push(["t", "str"]);
      cycle = escapeXml/*xml*/ `<v>${cell.value}</v>`;
    }
    node = escapeXml/*xml*/ `
      <f>
        ${XlsxFormula}
      </f>
      ${cycle}
    `;
    return { attrs, node };
  } else {
    // Shouldn't we always output the value then ?
    const value = cell.value;
    // what if value = 0? Is this condition correct?
    if (value) {
      const type = getCellType(value);
      attrs.push(["t", type]);
      node = escapeXml/*xml*/ `<v>${value}</v>`;
    }
    return { attrs, node };
  }
}

export function addContent(
  content: string,
  sharedStrings: string[]
): {
  attrs: XMLAttributes;
  node: XMLString;
} {
  let value: string = content;
  const attrs: XMLAttributes = [];

  if (["TRUE", "FALSE"].includes(value.trim())) {
    value = value === "TRUE" ? "1" : "0";
    attrs.push(["t", "b"]);
  } else if (!isNumber(value)) {
    const { id } = pushElement(content, sharedStrings);
    value = id.toString();
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
  return ast ? astToFormula(ast) : formulaText;
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
        args.push({ type: currentDefaultArg.type, value: currentDefaultArg.value });
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
  const internalDate = parseDateTime(value);
  if (internalDate) {
    let format: string[] = [];
    if (value.match(mdyDateRegexp) || value.match(ymdDateRegexp)) {
      format.push("yyyy-mm-dd");
    }
    if (value.match(timeRegexp)) {
      format.push("hh:mm:ss");
    }
    return {
      ...ast,
      value: formatDateTime({ value: internalDate.value, format: format.join(" ") }),
    };
  } else {
    return { ...ast, value: ast.value.replace(/\\"/g, `""`) };
  }
}
