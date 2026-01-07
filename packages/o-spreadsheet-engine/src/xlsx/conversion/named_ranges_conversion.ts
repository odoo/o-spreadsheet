import { NamedRangeData } from "../../types/workbook_data";
import { XLSXImportData } from "../../types/xlsx";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";

export function convertNamedRanges(
  data: XLSXImportData,
  warningManager: XLSXImportWarningManager
): NamedRangeData[] {
  const namedRanges: NamedRangeData[] = [];
  for (const xlsxNamedRange of data.namedRanges) {
    const sheetName = xlsxNamedRange.value.split("!")[0]?.replace(/'/g, "");
    if (!sheetName) {
      warningManager.addConversionWarning(
        `Named range "${xlsxNamedRange.name}" does not specify a sheet and will be ignored.`
      );
      continue;
    }
    namedRanges.push({
      // ADRM TODO: worry about valid named ranges
      rangeName: xlsxNamedRange.name,
      rangeString: xlsxNamedRange.value,
    });
  }
  return namedRanges;
}
