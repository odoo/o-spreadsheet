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
import { formatValue, isNumber } from "../../helpers";
import { mdyDateRegexp, parseDateTime, timeRegexp, ymdDateRegexp } from "../../helpers/dates";
import { ExcelCellData, Format } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { FORCE_DEFAULT_ARGS_FUNCTIONS, NON_RETROCOMPATIBLE_FUNCTIONS } from "../constants";
import { getCellType, pushElement } from "../helpers/content_helpers";
import { escapeXml } from "../helpers/xml_helpers";

export function addFormula(cell: ExcelCellData):
  | {
      attrs: XMLAttributes;
      node: XMLString;
    }
  | undefined {
  const formula = cell.content!;
  const functions = functionRegistry.content;
  const tokens = tokenize(formula);

  const attrs: XMLAttributes = [];
  let node = escapeXml``;

  const isExported = tokens
    .filter((tk) => tk.type === "FUNCTION")
    .every((tk) => functions[tk.value.toUpperCase()].isExported);

  const type = getCellType(cell.value);
  if (isExported) {
    const XlsxFormula = adaptFormulaToExcel(formula);
    node = escapeXml/*xml*/ `
      <f>
        ${XlsxFormula}
      </f>
      ${escapeXml/*xml*/ `<v>${cell.value}</v>`}
    `;
    attrs.push(["t", type]);
    return { attrs, node };
  } else {
    // If the cell contains a non-exported formula and that is evaluates to
    // nothing* ,we don't export it.
    // * non-falsy value are relevant and so are 0 and FALSE, which only leaves
    // the empty string.
    if (cell.value === "") return undefined;

    attrs.push(["t", type]);
    node = escapeXml/*xml*/ `<v>${cell.value}</v>`;
    return { attrs, node };
  }
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

  if (!forceString && ["TRUE", "FALSE"].includes(value.trim())) {
    value = value === "TRUE" ? "1" : "0";
    attrs.push(["t", "b"]);
  } else if (forceString || !isNumber(value)) {
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
    let format: Format[] = [];
    if (value.match(mdyDateRegexp) || value.match(ymdDateRegexp)) {
      format.push("yyyy-mm-dd");
    }
    if (value.match(timeRegexp)) {
      format.push("hh:mm:ss");
    }
    return {
      ...ast,
      value: formatValue(internalDate.value, format.join(" ")),
    };
  } else {
    return { ...ast, value: ast.value.replace(/\\"/g, `""`) };
  }
}
