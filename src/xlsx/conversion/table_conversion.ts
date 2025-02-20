import { INCORRECT_RANGE_STRING } from "../../constants";
import { deepEquals, toCartesian, toXC, toZone, zoneToXc } from "../../helpers";
import { BorderDescr, CellData, Style, WorkbookData, Zone } from "../../types";
import { SheetData } from "../../types/workbook_data";
import { XLSXImportData, XLSXTable, XLSXWorksheet } from "../../types/xlsx";
import { arrayToObject, objectToArray } from "../helpers/misc";

type CellMap = { [key: string]: CellData | undefined };

export const TABLE_HEADER_STYLE: Style = {
  fillColor: "#000000",
  textColor: "#ffffff",
  bold: true,
};

export const TABLE_HIGHLIGHTED_CELL_STYLE: Style = {
  bold: true,
};

export const TABLE_BORDER_STYLE: BorderDescr = ["thin", "#000000FF"];

/**
 * Convert the imported XLSX tables.
 *
 * We will create a FilterTable if the imported table have filters, then apply a style in all the cells of the table
 * and convert the table-specific formula references into standard references.
 *
 * Change the converted data in-place.
 */
export function convertTables(convertedData: WorkbookData, xlsxData: XLSXImportData) {
  for (const xlsxSheet of xlsxData.sheets) {
    for (const table of xlsxSheet.tables) {
      const sheet = convertedData.sheets.find((sheet) => sheet.name === xlsxSheet.sheetName);
      if (!sheet || !table.autoFilter) continue;
      if (!sheet.filterTables) sheet.filterTables = [];
      sheet.filterTables.push({ range: table.ref });
    }
  }

  applyTableStyle(convertedData, xlsxData);
  convertTableFormulaReferences(convertedData.sheets, xlsxData.sheets);
}

/**
 * Apply a style to all the cells that are in a table, and add the created styles in the  converted data.
 *
 * In XLSXs, the style of the cells of a table are not directly in the sheet, but rather deduced from the style of
 * the table that is defined in the table's XML file. The style of the table is a string referencing a standard style
 * defined in the OpenXML specifications. As there are 80+ different styles, we won't implement every one of them but
 * we will just define a style that will be used for all the imported tables.
 */
function applyTableStyle(convertedData: WorkbookData, xlsxData: XLSXImportData) {
  const styles = objectToArray(convertedData.styles);
  const borders = objectToArray(convertedData.borders);

  for (let xlsxSheet of xlsxData.sheets) {
    for (let table of xlsxSheet.tables) {
      const sheet = convertedData.sheets.find((sheet) => sheet.name === xlsxSheet.sheetName);
      if (!sheet) continue;
      const tableZone = toZone(table.ref);

      // Table style
      for (let i = 0; i < table.headerRowCount; i++) {
        applyStyleToZone(
          TABLE_HEADER_STYLE,
          { ...tableZone, bottom: tableZone.top + i },
          sheet.cells,
          styles
        );
      }
      for (let i = 0; i < table.totalsRowCount; i++) {
        applyStyleToZone(
          TABLE_HIGHLIGHTED_CELL_STYLE,
          { ...tableZone, top: tableZone.bottom - i },
          sheet.cells,
          styles
        );
      }
      if (table.style?.showFirstColumn) {
        applyStyleToZone(
          TABLE_HIGHLIGHTED_CELL_STYLE,
          { ...tableZone, right: tableZone.left },
          sheet.cells,
          styles
        );
      }
      if (table.style?.showLastColumn) {
        applyStyleToZone(
          TABLE_HIGHLIGHTED_CELL_STYLE,
          { ...tableZone, left: tableZone.right },
          sheet.cells,
          styles
        );
      }

      // Table borders
      // Borders at : table outline + col(/row) if showColumnStripes(/showRowStripes) + border above totalRow
      for (let col = tableZone.left; col <= tableZone.right; col++) {
        for (let row = tableZone.top; row <= tableZone.bottom; row++) {
          const xc = toXC(col, row);
          const cell = sheet.cells[xc];
          const border = {
            left:
              col === tableZone.left || table.style?.showColumnStripes
                ? TABLE_BORDER_STYLE
                : undefined,
            right: col === tableZone.right ? TABLE_BORDER_STYLE : undefined,
            top:
              row === tableZone.top ||
              table.style?.showRowStripes ||
              row > tableZone.bottom - table.totalsRowCount
                ? TABLE_BORDER_STYLE
                : undefined,
            bottom: row === tableZone.bottom ? TABLE_BORDER_STYLE : undefined,
          };
          const newBorder = cell?.border ? { ...borders[cell.border], ...border } : border;
          let borderIndex = borders.findIndex((border) => deepEquals(border, newBorder));
          if (borderIndex === -1) {
            borderIndex = borders.length;
            borders.push(newBorder);
          }
          if (cell) {
            cell.border = borderIndex;
          } else {
            sheet.cells[xc] = { border: borderIndex };
          }
        }
      }
    }
  }

  convertedData.styles = arrayToObject(styles);
  convertedData.borders = arrayToObject(borders);
}

/**
 * Apply a style to all the cells in the zone. The applied style WILL NOT overwrite values in existing style of the cell.
 *
 * If a style that was not in the styles array was applied, push it into the style array.
 */
function applyStyleToZone(appliedStyle: Style, zone: Zone, cells: CellMap, styles: Style[]) {
  for (let col = zone.left; col <= zone.right; col++) {
    for (let row = zone.top; row <= zone.bottom; row++) {
      const xc = toXC(col, row);
      const cell = cells[xc];
      const newStyle = cell?.style ? { ...styles[cell.style], ...appliedStyle } : appliedStyle;
      let styleIndex = styles.findIndex((style) => deepEquals(style, newStyle));
      if (styleIndex === -1) {
        styleIndex = styles.length;
        styles.push(newStyle);
      }
      if (cell) {
        cell.style = styleIndex;
      } else {
        cells[xc] = { style: styleIndex };
      }
    }
  }
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
            return INCORRECT_RANGE_STRING;
          }
          rowIndexes.push(tableZone.top);
          break;
        case "#Totals":
          if (!table.totalsRowCount) {
            return INCORRECT_RANGE_STRING;
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
        return INCORRECT_RANGE_STRING;
      }
      const colRelativeIndex = table.cols.findIndex((col) => col.name === columns[0]);
      if (colRelativeIndex === -1) {
        return INCORRECT_RANGE_STRING;
      }
      colIndexes.push(colRelativeIndex + tableZone.left);
      if (columns[1]) {
        const colRelativeIndex2 = table.cols.findIndex((col) => col.name === columns[1]);
        if (colRelativeIndex2 === -1) {
          return INCORRECT_RANGE_STRING;
        }
        colIndexes.push(colRelativeIndex2 + tableZone.left);
      }
    }
  }

  if (!areKeywordsCompatible(foundKeywords)) {
    return INCORRECT_RANGE_STRING;
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
