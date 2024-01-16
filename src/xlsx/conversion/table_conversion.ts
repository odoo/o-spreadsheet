import { deepEquals, positions, toCartesian, toXC, toZone, zoneToXc } from "../../helpers";
import { BorderDescr, CellData, Style, WorkbookData, Zone } from "../../types";
import { CellErrorType } from "../../types/errors";
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

export const TABLE_BORDER_STYLE: BorderDescr = { style: "thin", color: "#000000FF" };

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
  for (let sheet of convertedSheets) {
    const tables = xlsxSheets.find((s) => s.sheetName === sheet.name)!.tables;

    for (let table of tables) {
      const tabRef = table.name + "[";

      for (let position of positions(toZone(table.ref))) {
        const xc = toXC(position.col, position.row);
        const cell = sheet.cells[xc];

        if (cell && cell.content && cell.content.startsWith("=")) {
          let refIndex: number;

          while ((refIndex = cell.content.indexOf(tabRef)) !== -1) {
            let reference = cell.content.slice(refIndex + tabRef.length);

            // Expression can either be tableName[colName] or tableName[[#This Row], [colName]]
            let endIndex = reference.indexOf("]");
            if (reference.startsWith(`[`)) {
              endIndex = reference.indexOf("]", endIndex + 1);
              endIndex = reference.indexOf("]", endIndex + 1);
            }
            reference = reference.slice(0, endIndex);

            const convertedRef = convertTableReference(reference, table, xc);
            cell.content =
              cell.content.slice(0, refIndex) +
              convertedRef +
              cell.content.slice(tabRef.length + refIndex + endIndex + 1);
          }
        }
      }
    }
  }
}

/**
 * Convert table-specific references in formulas into standard references.
 *
 * A reference in a table can have the form (only the part between brackets should be given to this function):
 *  - tableName[colName] : reference to the whole column "colName"
 *  - tableName[[#keyword], [colName]] : reference to some of the element(s) of the column colName
 *
 * The available keywords are :
 * - #All : all the column (including totals)
 * - #Data : only the column data (no headers/totals)
 * - #Headers : only the header of the column
 * - #Totals : only the totals of the column
 * - #This Row : only the element in the same row as the cell
 */
function convertTableReference(expr: string, table: XLSXTable, cellXc: string) {
  const refElements = expr.split(",");
  const tableZone = toZone(table.ref);
  const refZone = { ...tableZone };
  let isReferencedZoneValid = true;

  // Single column reference
  if (refElements.length === 1) {
    const colRelativeIndex = table.cols.findIndex((col) => col.name === refElements[0]);
    refZone.left = refZone.right = colRelativeIndex + tableZone.left;
    if (table.headerRowCount) {
      refZone.top += table.headerRowCount;
    }
    if (table.totalsRowCount) {
      refZone.bottom -= 1;
    }
  }
  // Other references
  else {
    switch (refElements[0].slice(1, refElements[0].length - 1)) {
      case "#All":
        refZone.top = table.headerRowCount ? tableZone.top + table.headerRowCount : tableZone.top;
        refZone.bottom = tableZone.bottom;
        break;
      case "#Data":
        refZone.top = table.headerRowCount ? tableZone.top + table.headerRowCount : tableZone.top;
        refZone.bottom = table.totalsRowCount ? tableZone.bottom + 1 : tableZone.bottom;
        break;
      case "#This Row":
        refZone.top = refZone.bottom = toCartesian(cellXc).row;
        break;
      case "#Headers":
        refZone.top = refZone.bottom = tableZone.top;
        if (!table.headerRowCount) {
          isReferencedZoneValid = false;
        }
        break;
      case "#Totals":
        refZone.top = refZone.bottom = tableZone.bottom;
        if (!table.totalsRowCount) {
          isReferencedZoneValid = false;
        }
        break;
    }
    const colRef = refElements[1].slice(1, refElements[1].length - 1);
    const colRelativeIndex = table.cols.findIndex((col) => col.name === colRef);
    refZone.left = refZone.right = colRelativeIndex + tableZone.left;
  }

  if (!isReferencedZoneValid) {
    return CellErrorType.InvalidReference;
  }
  return refZone.top !== refZone.bottom ? zoneToXc(refZone) : toXC(refZone.left, refZone.top);
}
