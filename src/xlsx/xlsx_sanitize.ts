import { escapeRegExp, getUniqueText } from "../helpers/misc";
import { toZone, zoneToDimension } from "../helpers/zones";
import { ExcelWorkbookData } from "../types/workbook_data";

/**
 * Pre-construction normalization of `ExcelWorkbookData`. Applied before phase
 * 1 so the construction code does not have to think about Excel-side limits
 * that the in-memory model allows.
 */
export function sanitizeExcelData(data: ExcelWorkbookData): ExcelWorkbookData {
  data = fixLengthySheetNames(data);
  data = purgeSingleRowTables(data);
  return data;
}

/**
 * Excel sheet names are maximum 31 characters while o-spreadsheet does not
 * have this limit. Truncate names and rewrite every reference (cells, charts)
 * pointing at the renamed sheet.
 */
function fixLengthySheetNames(data: ExcelWorkbookData): ExcelWorkbookData {
  const nameMapping: Record<string, string> = {};
  const newNames: string[] = [];
  for (const sheet of data.sheets) {
    let newName = sheet.name.slice(0, 31);
    newName = getUniqueText(newName, newNames, {
      compute: (name, i) => name.slice(0, 31 - String(i).length) + i,
    });
    newNames.push(newName);
    if (newName !== sheet.name) {
      nameMapping[sheet.name] = newName;
      sheet.name = newName;
    }
  }

  if (!Object.keys(nameMapping).length) {
    return data;
  }

  const sheetWithNewNames = Object.keys(nameMapping).sort((a, b) => b.length - a.length);
  let stringifiedData = JSON.stringify(data);
  for (const sheetName of sheetWithNewNames) {
    const regex = new RegExp(`'?${escapeRegExp(sheetName)}'?!`, "g");
    stringifiedData = stringifiedData.replaceAll(regex, (match) => {
      const newName = nameMapping[sheetName];
      return match.replace(sheetName, newName);
    });
  }
  return JSON.parse(stringifiedData);
}

/**
 * Excel does not support tables whose defined range is a single row.
 * Single-row tables also offer no value (no filter, limited styling), so we
 * drop them silently rather than fail the export.
 */
function purgeSingleRowTables(data: ExcelWorkbookData): ExcelWorkbookData {
  for (const sheet of data.sheets) {
    sheet.tables = sheet.tables.filter(
      (table) => zoneToDimension(toZone(table.range)).numberOfRows > 1
    );
  }
  return data;
}
