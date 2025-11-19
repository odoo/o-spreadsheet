import { ExcelSheetData } from "../../types/workbook_data";
import { escapeXml } from "../helpers/xml_helpers";

export function addSheetProtection(sheet: ExcelSheetData) {
  if (sheet.isLocked) {
    return escapeXml/*xml*/ `<sheetProtection sheet="1" objects="1" scenarios="1" />`;
  }
  return "";
}
