import { XLSXWorksheet, XMLString } from "../../../types/xlsx";
import { escapeXml } from "../xlsx_xml";

export function serializeSheetProtection(sheet: XLSXWorksheet): XMLString {
  if (!sheet.isLocked) {
    return escapeXml``;
  }
  return escapeXml/*xml*/ `<sheetProtection sheet="1" objects="1" scenarios="1" />`;
}
