import { positions, toCartesian, toXC, toZone, zoneToXc } from "../../helpers";
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
