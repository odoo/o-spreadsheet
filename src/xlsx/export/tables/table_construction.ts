import { toXC } from "../../../helpers/coordinates";
import { range } from "../../../helpers/misc";
import { toZone, zoneToDimension } from "../../../helpers/zones";
import { ExcelSheetData } from "../../../types/workbook_data";
import { XLSXTable, XLSXTableCol } from "../../../types/xlsx";

/**
 * Phase-1: `ExcelTableData` + sheet cells → `XLSXTable`.
 *
 * Column header names are read from the sheet content here (so the
 * serializer does not need access to the cell map). Numeric IDs are
 * assigned at serialization time (they depend on workbook-wide order).
 */
export function constructTables(sheet: ExcelSheetData): XLSXTable[] {
  return sheet.tables.map((table) => {
    const zone = toZone(table.range);
    const cols: XLSXTableCol[] = [];
    for (const i of range(0, zoneToDimension(zone).numberOfCols)) {
      const headerXc = toXC(zone.left + i, zone.top);
      const name = (sheet.cells[headerXc] as string | undefined) || `col${i}`;
      const col: XLSXTableCol = { id: String(i + 1), name };
      if (table.config.totalRow) {
        const totalXc = toXC(zone.left + i, zone.bottom);
        const totalContent = sheet.cells[totalXc] as string | undefined;
        if (totalContent?.startsWith("=")) {
          col.colFormula = "custom";
        }
      }
      cols.push(col);
    }

    const autoFilter = table.config.hasFilters
      ? {
          zone: table.range,
          columns: table.filters.map((f) => ({
            colId: f.colId,
            filters: f.displayedValues.map((val) => ({ val })),
            displayBlanks: f.displayBlanks,
          })),
        }
      : undefined;

    return {
      // id + displayName are assigned at serialization time from the
      // workbook-wide sequential number.
      id: "",
      displayName: "",
      ref: table.range,
      headerRowCount: table.config.numberOfHeaders,
      totalsRowCount: table.config.totalRow ? 1 : 0,
      cols,
      style: {
        name: table.config.styleId,
        showFirstColumn: table.config.firstColumn,
        showLastColumn: table.config.lastColumn,
        showRowStripes: table.config.bandedRows,
        showColumnStripes: table.config.bandedColumns,
      },
      autoFilter,
    };
  });
}
