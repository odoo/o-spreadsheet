import { validNamedRangeNameRegex } from "../../plugins/core/named_range";
import { XLSXImportData } from "../../types/xlsx";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";

export function convertNamedRanges(
  data: XLSXImportData,
  warningManager: XLSXImportWarningManager
): { [name: string]: string } {
  const namedRanges: { [name: string]: string } = {};
  for (const xlsxNamedRange of data.namedRanges) {
    const sheetName = xlsxNamedRange.value.split("!")[0]?.replace(/'/g, "");
    if (!sheetName) {
      warningManager.addConversionWarning(
        `Named range "${xlsxNamedRange.name}" does not specify a sheet and will be ignored.`
      );
      continue;
    }
    if (!validNamedRangeNameRegex.test(xlsxNamedRange.name)) {
      warningManager.addConversionWarning(
        `Named range "${xlsxNamedRange.name}" has an invalid name and will be ignored.`
      );
      continue;
    }

    namedRanges[xlsxNamedRange.name] = xlsxNamedRange.value;
  }
  return namedRanges;
}
