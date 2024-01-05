import { toNumber } from "../../functions/helpers";
import {
  CellValue,
  DEFAULT_LOCALE,
  EvaluatedCell,
  FPayload,
  Locale,
  LocaleFormat,
  getEvaluatedCellProperties,
} from "../../types";
import { isDateTime } from "../dates";
import { detectDateFormat, detectNumberFormat, formatValue } from "../format";
import { detectLink } from "../links";
import { isBoolean } from "../misc";
import { isNumber } from "../numbers";

export function evaluateLiteral(
  content: string | undefined,
  localeFormat: LocaleFormat
): EvaluatedCell {
  const fPayload = {
    value: parseLiteral(content || "", localeFormat.locale),
    format: localeFormat.format,
  };
  return createEvaluatedCell(fPayload, localeFormat.locale);
}

export function parseLiteral(content: string, locale: Locale): Exclude<CellValue, null> {
  if (content.startsWith("=")) {
    throw new Error(`Cannot parse "${content}" because it's not a literal value. It's a formula`);
  }
  if (isNumber(content, DEFAULT_LOCALE)) {
    return toNumber(content, DEFAULT_LOCALE);
  }
  if (isDateTime(content, locale)) {
    return toNumber(content, locale);
  }
  if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE" ? true : false;
  }
  return content;
}

export function createEvaluatedCell(
  fPayload: FPayload,
  locale: Locale = DEFAULT_LOCALE
): EvaluatedCell {
  const link = detectLink(fPayload.value);
  if (!link) {
    return _createEvaluatedCell(fPayload, locale);
  }
  const linkPayload = {
    value: parseLiteral(link.label, locale),
    format:
      fPayload.format || detectDateFormat(link.label, locale) || detectNumberFormat(link.label),
  };
  return {
    ..._createEvaluatedCell(linkPayload, locale),
    link,
  };
}

function _createEvaluatedCell(fPayload: FPayload, locale: Locale): EvaluatedCell {
  return {
    ...fPayload,
    ...getEvaluatedCellProperties(fPayload),
    formattedValue: formatValue(fPayload.value, { format: fPayload.format, locale }),
  };
}
