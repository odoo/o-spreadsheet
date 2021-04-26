import { DEFAULT_FONT_SIZE } from "../constants";
import { AST, parse } from "../formulas/parser";
import { FORMULA_REF_IDENTIFIER } from "../formulas/tokenizer";
import { functionRegistry } from "../functions";
import {
  formatDateTime,
  mdyDateRegexp,
  parseDateTime,
  timeRegexp,
  ymdDateRegexp,
} from "../functions/dates";
import { Align, Border, CellData, NormalizedFormula, Style, WorkbookData } from "../types";
import { ExtractedStyle } from "../types/xlsx";
import {
  FIRST_NUMFMT_ID,
  FORCE_DEFAULT_ARGS_FUNCTIONS,
  HEIGHT_FACTOR,
  NON_RETROCOMPATIBLE_FUNCTIONS,
  WIDTH_FACTOR,
  XLSX_FORMAT_MAP,
} from "./constants";

type PropertyPosition<T> = {
  id: number;
  list: T[];
};

// -------------------------------------
//            CF HELPERS
// -------------------------------------

/**
 * Forces the first char of a string to lowerCase
 * e.g. BeginWith --> beginWith
 * */
export function convertOperator(operator: string): string {
  return operator.charAt(0).toLowerCase() + operator.slice(1);
}

// -------------------------------------
//        WORKSHEET HELPERS
// -------------------------------------

/**
 * Converts any CSS hexadecimal value (hex3 or hex6) to a standardizes hex6 value.
 * (note: number sign is dropped as it is not supported in xlsx format)
 */
export function toHex6(hex: string): string {
  if (hex.length > 7) {
    throw new Error("input should either be of form (#)hex3 or (#)hex6");
  }
  hex = hex.replace("#", "").toUpperCase();
  if (hex.length === 3) {
    hex = hex.split("").reduce((acc, h) => acc + h + h, "");
  }
  return hex;
}

export function getCellType(value: number | string | boolean): string {
  switch (typeof value) {
    case "boolean":
      return "b";
    case "string":
      return "str";
    case "number":
      return "n";
  }
}

/**
 * For some reason, Excel will only take the devicePixelRatio (i.e. interface scale on Windows desktop)
 * into account for the height.
 */
export function convertHeight(height: number): number {
  return Math.round(HEIGHT_FACTOR * height * window.devicePixelRatio * 100) / 100;
}

export function convertWidth(width: number): number {
  return Math.round(WIDTH_FACTOR * width * 100) / 100;
}

export function extractStyle(cell: CellData, data: WorkbookData): ExtractedStyle {
  let style: Style = {};
  if (cell.style) {
    style = data.styles[cell.style];
  }
  let border: Border = {};
  if (cell.border) {
    border = data.borders[cell.border];
  }
  const styles = {
    font: {
      size: style?.fontSize || DEFAULT_FONT_SIZE,
      color: style?.textColor ? style!.textColor : "000000",
      family: 2,
      name: "Arial",
    },
    fill: style?.fillColor
      ? {
          fgColor: style!.fillColor,
        }
      : { reservedAttribute: "none" },
    numFmt: cell.format,
    border: border || {},
    verticalAlignment: "center" as Align, // we always center vertically for now
    horizontalAlignment: style?.align,
  };

  styles.font["strike"] = !!style?.strikethrough || undefined;
  styles.font["bold"] = !!style?.bold || undefined;
  styles.font["italic"] = !!style?.italic || undefined;
  return styles;
}

export function convertFormat(format: string | undefined, numFmtStructure: string[]): number {
  if (!format) {
    return 0;
  }
  let formatId: number | undefined = XLSX_FORMAT_MAP[format];
  if (!formatId) {
    const { id } = pushElement(format, numFmtStructure);
    formatId = id + FIRST_NUMFMT_ID;
  }
  return formatId;
}

export function pushElement<T>(property: T, propertyList: T[]): PropertyPosition<T> {
  for (let [key, value] of Object.entries(propertyList)) {
    if (JSON.stringify(value) === JSON.stringify(property)) {
      return { id: parseInt(key, 10), list: propertyList };
    }
  }
  let elemId = propertyList.findIndex((elem) => JSON.stringify(elem) === JSON.stringify(property));
  if (elemId === -1) {
    propertyList.push(property);
    elemId = propertyList.length - 1;
  }
  return {
    id: elemId,
    list: propertyList,
  };
}

export function adaptFormulaToExcel(formula: NormalizedFormula): string {
  let formulaText = formula.text;
  if (formulaText[0] === "=") {
    formulaText = formulaText.slice(1);
  }
  const ast = parse(formulaText);
  let newFormulaText = ast ? `=${astToExcelFormula(ast)}` : formula.text;
  return getFormulaContent(newFormulaText, formula.dependencies);
}

/**
 * Converts an ast formula to the corresponding string
 *
 * We cannot use astToFormula directly; since the function is of recursive form,
 * it will call itself when we'd need it to call astToExcelFormula to process
 * the specific cases of FUNCALL and ASYNC_FUNCALL.
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

      // Prepend function names that are not compatible with Old Excel functions
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
        return ast.value;
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
