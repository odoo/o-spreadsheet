import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { ExcelSheetData, ExcelWorkbookData } from "../types/workbook_data";
import { XLSXSheetFormat, XLSXStructure, XLSXWorksheet } from "../types/xlsx";
import { constructHyperlinks } from "./export/hyperlinks/hyperlink_construction";
import { constructCols } from "./export/rows_and_cols/col_construction";
import { constructRows } from "./export/rows_and_cols/row_construction";
import { constructSheetProperties } from "./export/sheet_properties/sheet_properties_construction";
import { constructSheetViews } from "./export/sheet_views/sheet_view_construction";
import { createDefaultXLSXStructure } from "./export/styles/style_construction";
import { constructTables } from "./export/tables/table_construction";

/**
 * Phase 1 of the XLSX export pipeline: `ExcelWorkbookData` → `XLSXStructure`.
 *
 * Walks each sheet and composes per-feature constructors into one
 * `XLSXWorksheet` per sheet. Style primitives (fonts/fills/borders/
 * numFmts/styles) and shared strings are deduplicated onto the shared
 * `XLSXStructure` accumulator as cells are built.
 *
 * Phase 1 is pure with respect to packaging: no XML, no file paths, no rIDs.
 * Conditional formats, data validations, charts and images are intentionally
 * left as pass-through (the serializer reads them directly off
 * `ExcelWorkbookData`) — the XML structure is close enough to the source
 * that a dedicated XLSX intermediate would be churn.
 */
export function constructXLSX(data: ExcelWorkbookData): XLSXStructure {
  const structure = createDefaultXLSXStructure(data);
  for (const sheet of data.sheets) {
    structure.sheets.push(constructSheet(structure, data, sheet));
  }
  return structure;
}

function constructSheet(
  structure: XLSXStructure,
  data: ExcelWorkbookData,
  sheet: ExcelSheetData
): XLSXWorksheet {
  return {
    sheetName: sheet.name,
    isVisible: sheet.isVisible,
    sheetViews: constructSheetViews(sheet),
    sheetFormat: defaultSheetFormat(),
    sheetProperties: constructSheetProperties(sheet),
    cols: constructCols(sheet),
    rows: constructRows(structure, data, sheet),
    merges: [...sheet.merges],
    hyperlinks: constructHyperlinks(data, sheet),
    isLocked: !!sheet.isLocked,
    tables: constructTables(sheet),
    // Pass-through pieces handled directly by phase-2 serializers.
    cfs: [],
    dataValidations: [],
    sharedFormulas: [],
    figures: [],
    pivotTables: [],
  };
}

function defaultSheetFormat(): XLSXSheetFormat {
  return {
    defaultColWidth: DEFAULT_CELL_WIDTH,
    defaultRowHeight: DEFAULT_CELL_HEIGHT,
  };
}
