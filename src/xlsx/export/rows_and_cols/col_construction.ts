import { DEFAULT_CELL_WIDTH } from "../../../constants";
import { ExcelSheetData } from "../../../types/workbook_data";
import { XLSXColumn } from "../../../types/xlsx";
import { convertWidthToExcel } from "../xlsx_units";

export function constructCols(sheet: ExcelSheetData): XLSXColumn[] {
  const cols: XLSXColumn[] = [];
  for (const [idStr, col] of Object.entries(sheet.cols)) {
    const min = parseInt(idStr) + 1;
    cols.push({
      min,
      max: min,
      // Stored in Excel units to match the import's XLSXColumn shape.
      width: convertWidthToExcel(col.size ?? DEFAULT_CELL_WIDTH),
      customWidth: true,
      hidden: !!col.isHidden,
      outlineLevel: col.outlineLevel,
      collapsed: col.collapsed,
    });
  }
  return cols;
}
