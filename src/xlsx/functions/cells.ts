import { tokenize } from "../../formulas";
import { AST, parse } from "../../formulas/parser";
import { FORMULA_REF_IDENTIFIER } from "../../formulas/tokenizer";
import { functionRegistry } from "../../functions";
import {
  formatDateTime,
  mdyDateRegexp,
  parseDateTime,
  timeRegexp,
  ymdDateRegexp,
} from "../../functions/dates";
import { isNumber } from "../../helpers";
import { NormalizedFormula } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { FORCE_DEFAULT_ARGS_FUNCTIONS, NON_RETROCOMPATIBLE_FUNCTIONS } from "../constants";
import { getCellType, pushElement } from "../helpers/content_helpers";
import { escapeXml } from "../helpers/xml_helpers";

export function addFormula(
  formula: NormalizedFormula
): {
  attrs: XMLAttributes;
  node: XMLString;
} {
  const functions = functionRegistry.content;
  const tokens = tokenize(formula.text);

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
    if (formula.value === "#CYCLE") {
      attrs.push(["t", "str"]);
      cycle = escapeXml/*xml*/ `<v>${formula.value}</v>`;
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
    const value = formula.value;
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

export function adaptFormulaToExcel(formula: NormalizedFormula): string {
  let formulaText = formula.text;
  if (formulaText[0] === "=") {
    formulaText = formulaText.slice(1);
  }
  const ast = parse(formulaText);
  let newFormulaText = ast ? astToExcelFormula(ast) : formula.text;
  return getFormulaContent(newFormulaText, formula.dependencies);
}

/**
 * Converts an ast formula to the corresponding string
 *
 * We cannot use astToFormula directly; since the function is of recursive form,
 * it will call itself when we'd need it to call astToExcelFormula to process
 * the specific cases of FUNCALL and ASYNC_FUNCALL.
 * Function calls are different because:
 * - non retrocompatible function needs to be prepended
 * - required args which are optional in o-spreadsheet
 */
function astToExcelFormula(ast: AST): string {
  let value: string;
  switch (ast.type) {
    case "FUNCALL":
    case "ASYNC_FUNCALL":
      value = ast.value.toUpperCase();
      // In this case, the Excel function will need required args that might not be mandatory in Spreadsheet
      const exportDefaultArgs = FORCE_DEFAULT_ARGS_FUNCTIONS[value];
      if (exportDefaultArgs) {
        const requiredArgs = functionRegistry.content[value].args.filter((el) => !el.optional);
        const diffArgs = requiredArgs.length - ast.args.length;
        if (diffArgs) {
          // We know that we have at least 1 default Value missing
          for (let i = ast.args.length; i < requiredArgs.length; i++) {
            const currentDefaultArg = exportDefaultArgs[i - diffArgs];
            ast.args.push({ type: currentDefaultArg.type, value: currentDefaultArg.value });
          }
        }
      }

      // Prepend function names that are not compatible with Old Excel versions
      ast.value = NON_RETROCOMPATIBLE_FUNCTIONS.includes(value) ? `_xlfn.${value}` : value;
      const args = ast.args.map((arg) => astToExcelFormula(arg));
      return `${ast.value}(${args.join(",")})`;
    case "NUMBER":
      return ast.value.toString();
    case "STRING":
      // strings that correspond to a date should be converted to the format YYYY-DD-MM
      value = ast.value.replace(new RegExp('"', "g"), "");
      const internalDate = parseDateTime(value);
      if (internalDate) {
        let format: string[] = [];
        if (value.match(mdyDateRegexp) || value.match(ymdDateRegexp)) {
          format.push("yyyy-mm-dd");
        }
        if (value.match(timeRegexp)) {
          format.push("hh:mm:ss");
        }
        return `"${formatDateTime({ value: internalDate.value, format: format.join(" ") })}"`;
      } else {
        return ast.value.replace(/\\"/g, `""`);
      }
    case "BOOLEAN":
      return ast.value ? "TRUE" : "FALSE";
    case "UNARY_OPERATION":
      return ast.value + astToExcelFormula(ast.right);
    case "BIN_OPERATION":
      return astToExcelFormula(ast.left) + ast.value + astToExcelFormula(ast.right);
    case "REFERENCE":
      return `${FORMULA_REF_IDENTIFIER}${ast.value}${FORMULA_REF_IDENTIFIER}`;
    default:
      return ast.value;
  }
}

function getFormulaContent(formula: string, dependencies: string[]): string {
  let newContent = formula;
  if (dependencies) {
    for (let [index, d] of Object.entries(dependencies)) {
      const stringPosition = `\\${FORMULA_REF_IDENTIFIER}${index}\\${FORMULA_REF_IDENTIFIER}`;
      newContent = newContent.replace(new RegExp(stringPosition, "g"), d);
    }
  }
  return newContent;
}
