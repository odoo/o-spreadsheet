import { ExcelWorkbookData } from "../types/workbook_data";
import { XLSXExport } from "../types/xlsx";
import { constructXLSX } from "./xlsx_construction";
import { sanitizeExcelData } from "./xlsx_sanitize";
import { serializeXLSX } from "./xlsx_serialization";

/**
 * Entry point for the XLSX export pipeline.
 *
 * Three phases, all called sequentially:
 *
 *   1. `sanitizeExcelData` — cleanups on `ExcelWorkbookData` that handle
 *      Excel-specific limits the in-memory model does not enforce
 *      (e.g. 31-char sheet names, single-row tables).
 *
 *   2. `constructXLSX` — `ExcelWorkbookData` → `XLSXStructure`. Builds the
 *      XLSX-shaped intermediate (sheets, rows, cells, deduplicated styles
 *      and shared strings). No XML, no rIDs.
 *
 *   3. `serializeXLSX` — `XLSXStructure` → `XLSXExport`. Emits every XML
 *      file in the .xlsx package and manages all relationships.
 *
 * Output format follows ECMA-376 / OpenXML:
 * https://www.ecma-international.org/publications-and-standards/standards/ecma-376/
 */
export function getXLSX(data: ExcelWorkbookData): XLSXExport {
  data = sanitizeExcelData(data);
  const structure = constructXLSX(data);
  return serializeXLSX(structure, data);
}
