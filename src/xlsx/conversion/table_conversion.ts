import { toCartesian } from "../../helpers/coordinates";
import { isSheetNameEqual } from "../../helpers/sheet";
import { DEFAULT_TABLE_CONFIG, TABLE_PRESETS } from "../../helpers/table_presets";
import { toZone, zoneToXc } from "../../helpers/zones";
import { CellErrorType } from "../../types/errors";
import { TableConfig } from "../../types/table";
import { SheetData, WorkbookData } from "../../types/workbook_data";
import { XLSXImportData, XLSXPivotTable, XLSXTable, XLSXWorksheet } from "../../types/xlsx";

/**
 * Convert the imported XLSX tables and pivots convert the table-specific formula references into standard references.
 *
 * Change the converted data in-place.
 */
export function convertTables(convertedData: WorkbookData, xlsxData: XLSXImportData) {
  for (const xlsxSheet of xlsxData.sheets) {
    const sheet = convertedData.sheets.find((sheet) => sheet.name === xlsxSheet.sheetName);
    if (!sheet) {
      continue;
    }
    if (!sheet.tables) {
      sheet.tables = [];
    }

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
  let deconstructedSheets: DeconstructedSheets | null = null;

  for (const tableSheet of convertedSheets) {
    const tables = xlsxSheets.find((s) => isSheetNameEqual(s.sheetName, tableSheet.name))!.tables;
    if (!tables || tables.length === 0) {
      continue;
    }

    // Only deconstruct sheets if we are sure there are tables to process
    if (!deconstructedSheets) {
      deconstructedSheets = deconstructSheets(convertedSheets);
    }

    for (const table of tables) {
      for (const sheetId in deconstructedSheets) {
        const sheet = convertedSheets.find((s) => s.id === sheetId)!;
        for (const xc in deconstructedSheets[sheetId]) {
          const deconstructedCell = deconstructedSheets[sheetId][xc];

          for (let i = deconstructedCell.length - 3; i >= 0; i -= 2) {
            const possibleTable = deconstructedSheets[sheetId][xc][i];
            if (!possibleTable.endsWith(table.name!)) {
              continue;
            }
            const possibleRef = deconstructedSheets[sheetId][xc][i + 1];
            const sheetPrefix = tableSheet.id === sheet.id ? "" : tableSheet.name + "!";
            const convertedRef = convertTableReference(sheetPrefix, possibleRef, table, xc);
            deconstructedSheets[sheetId][xc][i + 2] =
              possibleTable.slice(0, possibleTable.indexOf(table.name!)) +
              convertedRef +
              deconstructedSheets[sheetId][xc][i + 2];
            deconstructedSheets[sheetId][xc].splice(i, 2);
          }
          // sheet.cells[xc] = cellContent;
        }
      }
    }
  }

  if (!deconstructedSheets) {
    return;
  }

  for (const sheetId in deconstructedSheets) {
    const sheet = convertedSheets.find((s) => s.id === sheetId)!;
    for (const xc in deconstructedSheets[sheetId]) {
      const deconstructedCell = deconstructedSheets[sheetId][xc];

      if (deconstructedCell.length === 1) {
        sheet.cells[xc] = deconstructedCell[0];
        continue;
      }

      let newContent = "";
      for (let i = 0; i < deconstructedCell.length; i += 2) {
        newContent += deconstructedCell[i] + "[" + deconstructedCell[i + 1] + "]";
      }
      newContent += deconstructedCell[deconstructedCell.length - 1];
      sheet.cells[xc] = newContent;
    }
  }
}

type DeconstructedSheets = { [sheetId: string]: { [xc: string]: string[] } };

/**
 * Deconstruct the content of the cells in the sheets to extract possible table references.
 * Example from "=AVERAGE(Table1[colName1])-AVERAGE(Table2[colName2])":
 * return --> ["=AVERAGE(Table1", "colName1", ")-AVERAGE(Table2", "colName2", ")"]
 */
function deconstructSheets(convertedSheets: SheetData[]): DeconstructedSheets {
  const deconstructedSheets: DeconstructedSheets = {};
  for (const sheet of convertedSheets) {
    for (const xc in sheet.cells) {
      const cellContent = sheet.cells[xc];
      if (!cellContent || !cellContent.startsWith("=")) {
        continue;
      }

      const startIndex = cellContent.indexOf("[");
      if (startIndex === -1) {
        continue;
      }

      const deconstructedCell: string[] = [];
      let possibleTable = cellContent.slice(0, startIndex);
      let possibleRef = "";
      let openBrackets = 1;
      let mainPossibleTableIndex = 0;
      let mainOpenBracketIndex = startIndex;

      for (let index = startIndex + 1; index < cellContent.length; index++) {
        if (cellContent[index] === "[") {
          if (openBrackets === 0) {
            possibleTable = cellContent.slice(mainPossibleTableIndex, index);
            mainOpenBracketIndex = index;
          }
          openBrackets++;
          continue;
        }
        if (cellContent[index] === "]") {
          openBrackets--;
          if (openBrackets === 0) {
            possibleRef = cellContent.slice(mainOpenBracketIndex + 1, index);
            deconstructedCell.push(possibleTable);
            deconstructedCell.push(possibleRef);
            mainPossibleTableIndex = index + 1;
          }
        }
      }

      if (deconstructedCell.length) {
        if (!deconstructedSheets[sheet.id]) {
          deconstructedSheets[sheet.id] = {};
        }
        deconstructedCell.push(cellContent.slice(mainPossibleTableIndex));
        deconstructedSheets[sheet.id][xc] = [...deconstructedCell];
      }
    }
  }
  return deconstructedSheets;
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
