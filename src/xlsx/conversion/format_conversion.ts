import { formatValue } from "../../helpers";
import { DEFAULT_LOCALE } from "../../types";
import { XLSXNumFormat } from "../../types/xlsx";
import { WarningTypes, XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { XLSX_FORMATS_CONVERSION_MAP } from "./conversion_maps";

const XLSX_DATE_FORMAT_REGEX = /^(yy|yyyy|m{1,5}|d{1,4}|h{1,2}|s{1,2}|am\/pm|a\/m|\s|-|\/|\.|:)+$/i;

/**
 * Convert excel format to o_spreadsheet format
 *
 * Excel format are defined in openXML §18.8.31
 */
export function convertXlsxFormat(
  numFmtId: number,
  formats: XLSXNumFormat[],
  warningManager: XLSXImportWarningManager
): string | undefined {
  if (numFmtId === 0) {
    return undefined;
  }
  // Format is either defined in the imported data, or the formatId is defined in openXML §18.8.30
  let format =
    XLSX_FORMATS_CONVERSION_MAP[numFmtId] || formats.find((f) => f.id === numFmtId)?.format;

  if (format) {
    try {
      let convertedFormat = format.replace(/(.*?);.*/, "$1"); // only take first part of multi-part format
      convertedFormat = convertedFormat.replace(/\[(.*)-[A-Z0-9]{3}\]/g, "[$1]"); // remove currency and locale/date system/number system info (ECMA §18.8.31)
      convertedFormat = convertedFormat.replace(/\[\$\]/g, ""); // remove empty bocks

      // Quotes in format escape sequences of characters. ATM we only support [$...] blocks to escape characters, and only one of them per format
      const numberOfQuotes = convertedFormat.match(/"/g)?.length || 0;
      const numberOfOpenBrackets = convertedFormat.match(/\[/g)?.length || 0;
      if (numberOfQuotes / 2 + numberOfOpenBrackets > 1) {
        throw new Error("Multiple escaped blocks in format");
      }
      convertedFormat = convertedFormat.replace(/"(.*)"/g, "[$$$1]"); // replace '"..."' by '[$...]'

      convertedFormat = convertedFormat.replace(/_.{1}/g, ""); // _ == ignore width of next char for align purposes. Not supported ATM
      convertedFormat = convertedFormat.replace(/\*.{1}/g, ""); // * == repeat next character enough to fill the line. Not supported ATM

      convertedFormat = convertedFormat.replace(/\\ /g, " "); // unescape spaces

      convertedFormat = convertedFormat.replace(/\\./g, (match) => match[1]); // unescape other characters

      if (isXlsxDateFormat(convertedFormat)) {
        convertedFormat = convertDateFormat(convertedFormat);
      }

      if (isFormatSupported(convertedFormat)) {
        return convertedFormat;
      }
    } catch (e) {}
  }

  warningManager.generateNotSupportedWarning(
    WarningTypes.NumFmtIdNotSupported,
    format || `nmFmtId ${numFmtId}`
  );
  return undefined;
}

function isFormatSupported(format: string): boolean {
  try {
    formatValue(0, { format, locale: DEFAULT_LOCALE });
    return true;
  } catch (e) {
    return false;
  }
}

function isXlsxDateFormat(format: string): boolean {
  return XLSX_DATE_FORMAT_REGEX.test(format);
}

function convertDateFormat(format: string): string {
  // Some of these aren't defined neither in the OpenXML spec not the Xlsx extension of OpenXML,
  // but can still occur and are supported by Excel/Google sheets

  format = format.toLowerCase();
  format = format.replace(/mmmmm/g, "mmm");
  format = format.replace(/am\/pm|a\/m/g, "a");
  format = format.replace(/hhhh/g, "hh");
  format = format.replace(/\bh\b/g, "hh");

  return format;
}
