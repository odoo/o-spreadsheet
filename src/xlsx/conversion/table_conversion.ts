import { toCartesian, toZone, zoneToXc } from "../../helpers";
import { DEFAULT_TABLE_CONFIG, TABLE_PRESETS } from "../../helpers/table_presets";
import { TableConfig, WorkbookData } from "../../types";
import { CellErrorType } from "../../types/errors";
import { SheetData } from "../../types/workbook_data";
import { XLSXImportData, XLSXPivotTable, XLSXTable, XLSXWorksheet } from "../../types/xlsx";

/**
 * Convert the imported XLSX tables and pivots convert the table-specific formula references into standard references.
 *
 * Change the converted data in-place.
 */
export function convertTables(convertedData: WorkbookData, xlsxData: XLSXImportData) {
  for (const xlsxSheet of xlsxData.sheets) {
    const sheet = convertedData.sheets.find((sheet) => sheet.name === xlsxSheet.sheetName);
    if (!sheet) continue;
    if (!sheet.tables) sheet.tables = [];

    for (const table of xlsxSheet.tables) {
      sheet.tables.push({ range: table.ref, config: convertTableConfig(table) });
    }

    for (const pivotTable of xlsxSheet.pivotTables) {
      sheet.tables.push({
        range: pivotTable.location.ref,
        config: convertPivotTableConfig(pivotTable),
      });
    }
  }

  convertTableFormulaReferences(convertedData.sheets, xlsxData.sheets);
}

function convertTableConfig(table: XLSXTable): TableConfig {
  const styleId = table.style?.name || "";
  return {
    hasFilters: table.autoFilter !== undefined,
    numberOfHeaders: table.headerRowCount,
    totalRow: table.totalsRowCount > 0,
    firstColumn: table.style?.showFirstColumn || false,
    lastColumn: table.style?.showLastColumn || false,
    bandedRows: table.style?.showRowStripes || false,
    bandedColumns: table.style?.showColumnStripes || false,
    styleId: TABLE_PRESETS[styleId] ? styleId : DEFAULT_TABLE_CONFIG.styleId,
  };
}

function convertPivotTableConfig(pivotTable: XLSXPivotTable): TableConfig {
  return {
    hasFilters: false,
    numberOfHeaders: pivotTable.location.firstDataRow,
    totalRow: pivotTable.rowGrandTotals,
    firstColumn: true,
    lastColumn: pivotTable.style?.showLastColumn || false,
    bandedRows: pivotTable.style?.showRowStripes || false,
    bandedColumns: pivotTable.style?.showColStripes || false,
    styleId: DEFAULT_TABLE_CONFIG.styleId,
  };
}

/**
 * In all the sheets, replace the table-only references in the formula cells with standard references.
 */
function convertTableFormulaReferences(convertedSheets: SheetData[], xlsxSheets: XLSXWorksheet[]) {
  for (let tableSheet of convertedSheets) {
    const tables = xlsxSheets.find((s) => s.sheetName === tableSheet.name)!.tables;

    for (let table of tables) {
      const tabRef = table.name + "[";
      for (let sheet of convertedSheets) {
        for (let xc in sheet.cells) {
          const cell = sheet.cells[xc];

          if (cell && cell.content && cell.content.startsWith("=")) {
            let refIndex: number;

            while ((refIndex = cell.content.indexOf(tabRef)) !== -1) {
              let endIndex = refIndex + tabRef.length;
              let openBrackets = 1;
              while (openBrackets > 0 && endIndex < cell.content.length) {
                if (cell.content[endIndex] === "[") {
                  openBrackets++;
                } else if (cell.content[endIndex] === "]") {
                  openBrackets--;
                }
                endIndex++;
              }
              let reference = cell.content.slice(refIndex + tabRef.length, endIndex - 1);

              const sheetPrefix = tableSheet.id === sheet.id ? "" : tableSheet.name + "!";
              const convertedRef = convertTableReference(sheetPrefix, reference, table, xc);
              cell.content =
                cell.content.slice(0, refIndex) + convertedRef + cell.content.slice(endIndex);
            }
          }
        }
      }
    }
  }
}

/**
 * Convert table-specific references in formulas into standard references. A table reference is composed of columns names,
 * and of keywords determining the rows of the table to reference.
 *
 * A reference in a table can have the form (only the part between brackets should be given to this function):
 *  - tableName[colName] : reference to the whole column "colName"
 *  - tableName[#keyword] : reference to the whatever row the keyword refers to
 *  - tableName[[#keyword], [colName]] : reference to some of the element(s) of the column colName
 *  - tableName[[#keyword], [colName]:[col2Name]] : reference to some of the element(s) of the columns colName to col2Name
 *  - tableName[[#keyword1], [#keyword2], [colName]] : reference to all the rows referenced by the keywords in the column colName
 *  - tableName[[#keyword1], [colName], [#keyword2]]: the keywords and colName can be in any order
 *
 *
 * The available keywords are :
 * - #All : all the column (including totals)
 * - #Data : only the column data (no headers/totals)
 * - #Headers : only the header of the column
 * - #Totals : only the totals of the column
 * - #This Row : only the element in the same row as the cell
 *
 * Note that the only valid combination of multiple keywords are #Data + #Totals and #Headers + #Data.
 */
function convertTableReference(
  sheetPrefix: string,
  expr: string,
  table: XLSXTable,
  cellXc: string
) {
  // TODO: Ideally we'd want to make a real tokenizer, this simple approach won't work if for example the column name
  // contain # or , characters. But that's probably an edge case that we can ignore for now.
  const parts = expr.split(",").map((part) => part.trim());
  const tableZone = toZone(table.ref);
  const colIndexes: number[] = [];
  const rowIndexes: number[] = [];
  const foundKeywords: string[] = [];

  for (const part of parts) {
    if (removeBrackets(part).startsWith("#")) {
      const keyWord = removeBrackets(part);
      foundKeywords.push(keyWord);
      switch (keyWord) {
        case "#All":
          rowIndexes.push(tableZone.top, tableZone.bottom);
          break;
        case "#Data":
          const top = table.headerRowCount ? tableZone.top + table.headerRowCount : tableZone.top;
          const bottom = table.totalsRowCount
            ? tableZone.bottom - table.totalsRowCount
            : tableZone.bottom;
          rowIndexes.push(top, bottom);
          break;
        case "#This Row":
          rowIndexes.push(toCartesian(cellXc).row);
          break;
        case "#Headers":
          if (!table.headerRowCount) {
            return CellErrorType.InvalidReference;
          }
          rowIndexes.push(tableZone.top);
          break;
        case "#Totals":
          if (!table.totalsRowCount) {
            return CellErrorType.InvalidReference;
          }
          rowIndexes.push(tableZone.bottom);
          break;
      }
    } else {
      const columns = part
        .split(":")
        .map((part) => part.trim())
        .map(removeBrackets);
      if (colIndexes.length) {
        return CellErrorType.InvalidReference;
      }
      const colRelativeIndex = table.cols.findIndex((col) => col.name === columns[0]);
      if (colRelativeIndex === -1) {
        return CellErrorType.InvalidReference;
      }
      colIndexes.push(colRelativeIndex + tableZone.left);
      if (columns[1]) {
        const colRelativeIndex2 = table.cols.findIndex((col) => col.name === columns[1]);
        if (colRelativeIndex2 === -1) {
          return CellErrorType.InvalidReference;
        }
        colIndexes.push(colRelativeIndex2 + tableZone.left);
      }
    }
  }

  if (!areKeywordsCompatible(foundKeywords)) {
    return CellErrorType.InvalidReference;
  }

  if (rowIndexes.length === 0) {
    const top = table.headerRowCount ? tableZone.top + table.headerRowCount : tableZone.top;
    const bottom = table.totalsRowCount
      ? tableZone.bottom - table.totalsRowCount
      : tableZone.bottom;
    rowIndexes.push(top, bottom);
  }
  if (colIndexes.length === 0) {
    colIndexes.push(tableZone.left, tableZone.right);
  }

  const refZone = {
    top: Math.min(...rowIndexes),
    left: Math.min(...colIndexes),
    bottom: Math.max(...rowIndexes),
    right: Math.max(...colIndexes),
  };

  return sheetPrefix + zoneToXc(refZone);
}

function removeBrackets(str: string) {
  return str.startsWith("[") && str.endsWith("]") ? str.slice(1, str.length - 1) : str;
}

function areKeywordsCompatible(keywords: string[]) {
  if (keywords.length < 2) {
    return true;
  } else if (keywords.length > 2) {
    return false;
  } else if (keywords.includes("#Data") && keywords.includes("#Totals")) {
    return true;
  } else if (keywords.includes("#Headers") && keywords.includes("#Data")) {
    return true;
  }

  return false;
}
