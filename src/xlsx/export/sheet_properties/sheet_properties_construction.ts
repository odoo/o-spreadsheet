import { ExcelSheetData } from "../../../types/workbook_data";
import { XLSXSheetProperties } from "../../../types/xlsx";

export function constructSheetProperties(sheet: ExcelSheetData): XLSXSheetProperties | undefined {
  if (!sheet.color) {
    return undefined;
  }
  return { tabColor: { rgb: sheet.color } };
}
