import { tokenize } from "../../formulas/tokenizer";
import { Dimension, ExcelHeaderData, ExcelSheetData } from "../../types";

/**
 * Get the path (from the root of the xlsx) of the file targeted by a relationship of the given source file.
 * The target is either absolute (starting with "/") or relative to the folder of the source file.
 *
 * Eg.:
 * from "xl/workbook.xml" to "worksheets/sheet1.xml" => "xl/worksheets/sheet1.xml"
 * from "xl/workbook.xml" to "/xl/worksheets/sheet1.xml" => "xl/worksheets/sheet1.xml"
 */
export function resolveRelationshipTarget(sourceFile: string, target: string): string {
  const pathParts = target.startsWith("/") ? [] : sourceFile.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (part === "..") {
      pathParts.pop();
    } else if (part && part !== ".") {
      pathParts.push(part);
    }
  }
  return pathParts.join("/");
}

/**
 * Convert an array of element into an object where the objects keys were the elements position in the array.
 * Can give an offset as argument, and all the array indexes will we shifted by this offset in the returned object.
 *
 * eg. : ["a", "b"] => {0:"a", 1:"b"}
 */
export function arrayToObject<T>(array: T[], indexOffset = 0): { [key: number]: T } {
  const obj = {};
  for (let i = 0; i < array.length; i++) {
    if (array[i]) {
      obj[i + indexOffset] = array[i];
    }
  }
  return obj;
}

/**
 * Convert an object whose keys are numbers to an array were the element index was their key in the object.
 *
 * eg. : {0:"a", 2:"b"} => ["a", undefined, "b"]
 */
export function objectToArray<T>(obj: { [key: number]: T }): T[] {
  const arr: T[] = [];
  for (const key of Object.keys(obj).map(Number)) {
    arr[key] = obj[key];
  }
  return arr;
}

/**
 * In xlsx we can have string with unicode characters with the format _x00fa_.
 * Replace with characters understandable by JS
 */
export function fixXlsxUnicode(str: string): string {
  return str.replace(/_x([0-9a-zA-Z]{4})_/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
}

/** Get a header in the SheetData. Create the header if it doesn't exist in the SheetData */
export function getSheetDataHeader(
  sheetData: ExcelSheetData,
  dimension: Dimension,
  index: number
): ExcelHeaderData {
  if (dimension === "COL") {
    if (!sheetData.cols[index]) {
      sheetData.cols[index] = {};
    }
    return sheetData.cols[index];
  }
  if (!sheetData.rows[index]) {
    sheetData.rows[index] = {};
  }
  return sheetData.rows[index];
}

/** Prefix the string by "=" if the string looks like a formula */
export function prefixFormulaWithEqual(formula: string): string {
  if (formula[0] === "=") {
    return formula;
  }
  const tokens = tokenize(formula);
  return tokens.length === 1 && tokens[0].type !== "REFERENCE" ? formula : "=" + formula;
}
