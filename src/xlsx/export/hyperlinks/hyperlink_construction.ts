import { withHttps } from "../../../helpers/links";
import {
  isMarkdownLink,
  isSheetUrl,
  parseMarkdownLink,
  parseSheetUrl,
} from "../../../helpers/misc";
import { CellErrorType } from "../../../types/errors";
import { ExcelSheetData, ExcelWorkbookData } from "../../../types/workbook_data";
import { XLSXHyperLink } from "../../../types/xlsx";

export function constructHyperlinks(
  data: ExcelWorkbookData,
  sheet: ExcelSheetData
): XLSXHyperLink[] {
  const links: XLSXHyperLink[] = [];
  for (const xc in sheet.cells) {
    const content = sheet.cells[xc] as string | undefined;
    if (!content || !isMarkdownLink(content)) {
      continue;
    }
    const { label, url } = parseMarkdownLink(content);
    if (isSheetUrl(url)) {
      const sheetId = parseSheetUrl(url);
      const linked = data.sheets.find((s) => s.id === sheetId);
      const location = linked ? `${linked.name}!A1` : CellErrorType.InvalidReference;
      links.push({ xc, display: label, location });
    } else {
      // Phase-2 serializer registers `relTarget` as a hyperlink rel and binds
      // an rId to this entry.
      links.push({ xc, display: label, relTarget: withHttps(url) });
    }
  }
  return links;
}
