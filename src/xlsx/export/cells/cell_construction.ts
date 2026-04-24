import { astToFormula } from "../../../formulas/formula_formatter";
import { AST, ASTFuncall, ASTString, convertAstNodes, parse } from "../../../formulas/parser";
import { functionRegistry } from "../../../functions/function_registry";
import { isNumber } from "../../../helpers";
import { mdyDateRegexp, parseDateTime, timeRegexp, ymdDateRegexp } from "../../../helpers/dates";
import { formatValue, isTextFormat } from "../../../helpers/format/format";
import { isMarkdownLink, parseMarkdownLink } from "../../../helpers/misc";
import { CellValue } from "../../../types/cells";
import { CellErrorType } from "../../../types/errors";
import { Format } from "../../../types/format";
import { DEFAULT_LOCALE } from "../../../types/locale";
import { ExcelSheetData, ExcelWorkbookData } from "../../../types/workbook_data";
import { XLSXCell, XLSXCellType, XLSXStructure } from "../../../types/xlsx";
import { FORCE_DEFAULT_ARGS_FUNCTIONS, NON_RETROCOMPATIBLE_FUNCTIONS } from "../../constants";
import { pushElement } from "../styles/style_construction";

/**
 * Build the XLSXCell for a position, or return `undefined` if nothing should
 * be emitted for that position.
 *
 * Mutates `construct.sharedStrings` when the cell holds a text value.
 */
export function constructCell(params: {
  xc: string;
  content: string | undefined;
  value: CellValue | undefined;
  formulaSpillRange: string;
  styleIndex: number;
  formatId: number | undefined;
  data: ExcelWorkbookData;
  construct: XLSXStructure;
  isForcedString: boolean;
}): XLSXCell | undefined {
  const { xc, content, value, formulaSpillRange, styleIndex, formatId, data, construct } = params;
  const style = styleIndex ? styleIndex : undefined;

  // Formula cell. If the computed value's type isn't exportable, fall
  // through to the empty-cell branch — matches the pre-refactor behavior
  // where `addFormula` returned `{ attrs: [], node: "" }` and the wrapping
  // `<c>` was still emitted.
  if (content?.startsWith("=") && value !== undefined) {
    const type = xlsxCellTypeFromValue(value);
    if (type !== undefined) {
      const formulaText = adaptFormulaToExcel(content);
      const exportedValue = formulaValueToString(value);
      return {
        xc,
        styleIndex: style,
        type,
        value: exportedValue,
        formula: { content: formulaText, ref: formulaSpillRange },
      };
    }
  }

  // Markdown-link cell — the label is the content; the URL is handled by
  // hyperlink construction.
  if (content && isMarkdownLink(content)) {
    const { label } = parseMarkdownLink(content);
    return contentCell(xc, style, label, construct, /* forceString */ false);
  }

  // Plain content cell (text / number / boolean)
  if (content && content !== "") {
    const isPlainText = !!(formatId && isTextFormat(data.formats[formatId]));
    return contentCell(xc, style, content, construct, params.isForcedString || isPlainText);
  }

  // Empty cell at a position that was flagged by `shouldEmitCell` (it has a
  // style / format / border, or a spilled value).
  return { xc, styleIndex: style, type: "number" };
}

function contentCell(
  xc: string,
  styleIndex: number | undefined,
  content: string,
  construct: XLSXStructure,
  forceString: boolean
): XLSXCell {
  const clearValue = content.trim().toUpperCase();
  if (!forceString && (clearValue === "TRUE" || clearValue === "FALSE")) {
    return {
      xc,
      styleIndex,
      type: "boolean",
      value: clearValue === "TRUE" ? "1" : "0",
    };
  }
  if (forceString || !isNumber(content, DEFAULT_LOCALE)) {
    const index = pushElement(content, construct.sharedStrings);
    return { xc, styleIndex, type: "sharedString", value: String(index) };
  }
  return { xc, styleIndex, type: "number", value: content };
}

function xlsxCellTypeFromValue(value: CellValue | undefined): XLSXCellType | undefined {
  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "string":
      return "str";
    case "number":
      return "number";
    default:
      return undefined;
  }
}

function formulaValueToString(value: CellValue): string {
  const adapted = value === CellErrorType.InvalidReference ? "#REF!" : value;
  return String(adapted);
}

export function shouldEmitCell(
  content: string | undefined,
  value: CellValue | undefined,
  styleId: number | undefined,
  formatId: number | undefined,
  borderId: number | undefined
): boolean {
  return !!(content || styleId || formatId || borderId || value !== undefined);
}

export function isTableHeaderOrTotal(col: number, row: number, sheet: ExcelSheetData): boolean {
  for (const table of sheet.tables) {
    const [tl, br] = parseTableRange(table.range);
    if (row === tl.row && col >= tl.col && col <= br.col) {
      return true;
    }
    if (table.config.totalRow && row === br.row && col >= tl.col && col <= br.col) {
      return true;
    }
  }
  return false;
}

function parseTableRange(
  range: string
): [{ col: number; row: number }, { col: number; row: number }] {
  const [topLeft, bottomRight] = range.split(":");
  return [xcToPosition(topLeft), xcToPosition(bottomRight)];
}

function xcToPosition(xc: string): { col: number; row: number } {
  const match = xc.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) {
    return { col: 0, row: 0 };
  }
  const [, letters, digits] = match;
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { col: col - 1, row: parseInt(digits, 10) - 1 };
}

// -------------------------------------
//    FORMULA ADAPTATION (o-spreadsheet → Excel)
// -------------------------------------

/**
 * Adapt an o-spreadsheet formula text to Excel syntax:
 *  - uppercase function names,
 *  - prefix non-retrocompatible functions with "_xlfn.",
 *  - add missing required args for Excel-only required parameters,
 *  - convert #REF errors to Excel's "#REF!",
 *  - convert bare date strings to canonical formats so Excel parses them.
 *
 * Exported because it is used directly by some unit tests.
 */
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

function addMissingRequiredArgs(ast: ASTFuncall): ASTFuncall {
  const formulaName = ast.value.toUpperCase();
  const args = ast.args;
  const exportDefaultArgs = FORCE_DEFAULT_ARGS_FUNCTIONS[formulaName];
  if (exportDefaultArgs) {
    const requiredArgs = functionRegistry.content[formulaName].args.filter((el) => !el.optional);
    const diffArgs = requiredArgs.length - ast.args.length;
    if (diffArgs) {
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

function prependNonRetrocompatibleFunction(ast: ASTFuncall): ASTFuncall {
  const formulaName = ast.value.toUpperCase();
  return {
    ...ast,
    value: NON_RETROCOMPATIBLE_FUNCTIONS.includes(formulaName)
      ? `_xlfn.${formulaName}`
      : formulaName,
  };
}

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
      value: formatValue(internalDate.value, { format: format.join(" "), locale: DEFAULT_LOCALE }),
    };
  } else {
    return { ...ast, value: ast.value.replace(/\\"/g, `""`) };
  }
}
