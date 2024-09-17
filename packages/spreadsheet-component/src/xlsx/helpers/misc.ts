import { Dimension, ExcelHeaderData, ExcelSheetData } from "../../types";

/**
 * Get the relative path between two files
 *
 * Eg.:
 * from "folder1/file1.txt" to "folder2/file2.txt" => "../folder2/file2.txt"
 */
export function getRelativePath(from: string, to: string): string {
  const fromPathParts = from.split("/");
  const toPathParts = to.split("/");

  let relPath = "";
  let startIndex = 0;
  for (let i = 0; i < fromPathParts.length - 1; i++) {
    if (fromPathParts[i] === toPathParts[i]) {
      startIndex++;
    } else {
      relPath += "../";
    }
  }
  relPath += toPathParts.slice(startIndex).join("/");

  return relPath;
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
  for (let key of Object.keys(obj).map(Number)) {
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
