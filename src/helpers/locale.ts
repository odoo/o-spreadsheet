import { tokenize } from "../formulas/tokenizer";
import { toNumber } from "../functions/helpers";
import {
  ColorScaleThreshold,
  ConditionalFormatRule,
  DataValidationRule,
  DEFAULT_LOCALE,
  IconThreshold,
  Locale,
} from "../types";
import { isDateTime } from "./dates";
import { formatValue, getDecimalNumberRegex } from "./format";
import { deepCopy } from "./misc";
import { isNumber } from "./numbers";

export function isValidLocale(locale: any): locale is Locale {
  if (
    !(
      locale &&
      typeof locale === "object" &&
      typeof locale.name === "string" &&
      typeof locale.code === "string" &&
      typeof locale.thousandsSeparator === "string" &&
      typeof locale.decimalSeparator === "string" &&
      typeof locale.dateFormat === "string" &&
      typeof locale.timeFormat === "string" &&
      typeof locale.formulaArgSeparator === "string"
    )
  ) {
    return false;
  }

  if (!Object.values(locale).every((v) => v)) {
    return false;
  }

  if (locale.formulaArgSeparator === locale.decimalSeparator) {
    return false;
  }
  if (locale.thousandsSeparator === locale.decimalSeparator) {
    return false;
  }

  try {
    formatValue(1, { locale, format: "#,##0.00" });
    formatValue(1, { locale, format: locale.dateFormat });
    formatValue(1, { locale, format: locale.timeFormat });
  } catch {
    return false;
  }
  return true;
}

/**
 * Change a content string from the given locale to its canonical form (en_US locale). Don't convert date string.
 *
 * @example
 * canonicalizeNumberContent("=SUM(1,5; 02/12/2012)", FR_LOCALE) // "=SUM(1.5, 02/12/2012)"
 * canonicalizeNumberContent("125,9", FR_LOCALE) // "125.9"
 * canonicalizeNumberContent("02/12/2012", FR_LOCALE) // "02/12/2012"
 */
export function canonicalizeNumberContent(content: string, locale: Locale) {
  return content.startsWith("=")
    ? canonicalizeFormula(content, locale)
    : canonicalizeNumberLiteral(content, locale);
}

/**
 * Change a content string from the given locale to its canonical form (en_US locale). Also convert date string.
 * This is destructive and won't preserve the original format.
 *
 * @example
 * canonicalizeContent("=SUM(1,5; 5)", FR_LOCALE) // "=SUM(1.5, 5)"
 * canonicalizeContent("125,9", FR_LOCALE) // "125.9"
 * canonicalizeContent("02/12/2012", FR_LOCALE) // "12/02/2012"
 * canonicalizeContent("02-12-2012", FR_LOCALE) // "12/02/2012"
 */
export function canonicalizeContent(content: string, locale: Locale) {
  return content.startsWith("=")
    ? canonicalizeFormula(content, locale)
    : canonicalizeLiteral(content, locale);
}

/**
 * Change a content string from its canonical form (en_US locale) to the given locale. Don't convert date string.
 * This is destructive and won't preserve the original format.
 *
 * @example
 * localizeNumberContent("=SUM(1.5, 5)", FR_LOCALE) // "=SUM(1,5; 5)"
 * localizeNumberContent("125.9", FR_LOCALE) // "125,9"
 * localizeNumberContent("02/12/2012", FR_LOCALE) // "12/02/2012"
 * localizeNumberContent("02-12-2012", FR_LOCALE) // "12/02/2012"
 */
export function localizeNumberContent(content: string, locale: Locale) {
  return content.startsWith("=")
    ? localizeFormula(content, locale)
    : localizeNumberLiteral(content, locale);
}

/**
 * Change a content string from its canonical form (en_US locale) to the given locale. Also convert date string.
 *
 * @example
 * localizeContent("=SUM(1.5, 5)", FR_LOCALE) // "=SUM(1,5; 5)"
 * localizeContent("125.9", FR_LOCALE) // "125,9"
 * localizeContent("12/02/2012", FR_LOCALE) // "02/12/2012"
 */
export function localizeContent(content: string, locale: Locale) {
  return content.startsWith("=")
    ? localizeFormula(content, locale)
    : localizeLiteral(content, locale);
}

/** Change a formula to its canonical form (en_US locale) */
function canonicalizeFormula(formula: string, locale: Locale) {
  return _localizeFormula(formula, locale, DEFAULT_LOCALE);
}

/** Change a formula from the canonical form to the given locale */
export function localizeFormula(formula: string, locale: Locale) {
  return _localizeFormula(formula, DEFAULT_LOCALE, locale);
}

function _localizeFormula(formula: string, fromLocale: Locale, toLocale: Locale) {
  if (
    fromLocale.formulaArgSeparator === toLocale.formulaArgSeparator &&
    fromLocale.decimalSeparator === toLocale.decimalSeparator
  ) {
    return formula;
  }

  const tokens = tokenize(formula, fromLocale);
  let localizedFormula = "";
  for (const token of tokens) {
    if (token.type === "NUMBER") {
      localizedFormula += token.value.replace(
        fromLocale.decimalSeparator,
        toLocale.decimalSeparator
      );
    } else if (token.type === "ARG_SEPARATOR") {
      localizedFormula += toLocale.formulaArgSeparator;
    } else {
      localizedFormula += token.value;
    }
  }

  return localizedFormula;
}

/**
 * Change a literal string from the given locale to its canonical form (en_US locale). Don't convert date string.
 *
 * @example
 * canonicalizeNumberLiteral("125,9", FR_LOCALE) // "125.9"
 * canonicalizeNumberLiteral("02/12/2012", FR_LOCALE) // "02/12/2012"
 */
export function canonicalizeNumberLiteral(content: string, locale: Locale): string {
  if (locale.decimalSeparator === "." || !isNumber(content, locale)) {
    return content;
  }
  return content.replace(locale.decimalSeparator, ".");
}

/**
 * Change a content string from the given locale to its canonical form (en_US locale). Also convert date string.
 * This is destructive and won't preserve the original format.
 *
 * @example
 * canonicalizeLiteral("125,9", FR_LOCALE) // "125.9"
 * canonicalizeLiteral("02/12/2012", FR_LOCALE) // "12/02/2012"
 * canonicalizeLiteral("02-12-2012", FR_LOCALE) // "12/02/2012"
 */
function canonicalizeLiteral(content: string, locale: Locale) {
  if (isDateTime(content, locale)) {
    const dateNumber = toNumber(content, locale);
    let format = DEFAULT_LOCALE.dateFormat;
    if (!Number.isInteger(dateNumber)) {
      format += " " + DEFAULT_LOCALE.timeFormat;
    }
    return formatValue(dateNumber, { locale: DEFAULT_LOCALE, format });
  }
  return canonicalizeNumberLiteral(content, locale);
}

/**
 * Change a literal string from its canonical form (en_US locale) to the given locale. Don't convert date string.
 * This is destructive and won't preserve the original format.
 *
 * @example
 * localizeNumberLiteral("125.9", FR_LOCALE) // "125,9"
 * localizeNumberLiteral("12/02/2012", FR_LOCALE) // "12/02/2012"
 * localizeNumberLiteral("12-02-2012", FR_LOCALE) // "12/02/2012"
 */
function localizeNumberLiteral(literal: string, locale: Locale): string {
  if (locale.decimalSeparator === "." || !isNumber(literal, DEFAULT_LOCALE)) {
    return literal;
  }

  const decimalNumberRegex = getDecimalNumberRegex(DEFAULT_LOCALE);
  const localized = literal.replace(decimalNumberRegex, (match) => {
    return match.replace(".", locale.decimalSeparator);
  });
  return localized;
}

/**
 * Change a literal string from its canonical form (en_US locale) to the given locale. Also convert date string.
 *
 * @example
 * localizeLiteral("125.9", FR_LOCALE) // "125,9"
 * localizeLiteral("12/02/2012", FR_LOCALE) // "02/12/2012"
 */
function localizeLiteral(literal: string, locale: Locale): string {
  if (isDateTime(literal, DEFAULT_LOCALE)) {
    const dateNumber = toNumber(literal, DEFAULT_LOCALE);
    let format = locale.dateFormat;
    if (!Number.isInteger(dateNumber)) {
      format += " " + locale.timeFormat;
    }
    return formatValue(dateNumber, { locale, format });
  }
  return localizeNumberLiteral(literal, locale);
}

export function canonicalizeCFRule(
  cf: ConditionalFormatRule,
  locale: Locale
): ConditionalFormatRule {
  return changeCFRuleLocale(cf, (content) => canonicalizeContent(content, locale));
}

export function localizeCFRule(cf: ConditionalFormatRule, locale: Locale): ConditionalFormatRule {
  return changeCFRuleLocale(cf, (content) => localizeContent(content, locale));
}

export function localizeDataValidationRule(
  rule: DataValidationRule,
  locale: Locale
): DataValidationRule {
  const localizedDVRule = deepCopy(rule);
  localizedDVRule.criterion.values = localizedDVRule.criterion.values.map((content) =>
    localizeContent(content, locale)
  );
  return localizedDVRule;
}

function changeCFRuleLocale(
  rule: ConditionalFormatRule,
  changeContentLocale: (content: string) => string
): ConditionalFormatRule {
  rule = deepCopy(rule);
  switch (rule.type) {
    case "CellIsRule":
      // Only change value for number operators
      switch (rule.operator) {
        case "Between":
        case "NotBetween":
        case "Equal":
        case "NotEqual":
        case "GreaterThan":
        case "GreaterThanOrEqual":
        case "LessThan":
        case "LessThanOrEqual":
          rule.values = rule.values.map((v) => changeContentLocale(v));
          return rule;
        case "BeginsWith":
        case "ContainsText":
        case "EndsWith":
        case "NotContains":
        case "IsEmpty":
        case "IsNotEmpty":
          return rule;
      }
      break;
    case "ColorScaleRule":
      rule.minimum = changeCFRuleThresholdLocale(rule.minimum, changeContentLocale);
      rule.maximum = changeCFRuleThresholdLocale(rule.maximum, changeContentLocale);
      if (rule.midpoint) {
        rule.midpoint = changeCFRuleThresholdLocale(rule.midpoint, changeContentLocale);
      }
      return rule;
    case "IconSetRule":
      rule.lowerInflectionPoint.value = changeContentLocale(rule.lowerInflectionPoint.value);
      rule.upperInflectionPoint.value = changeContentLocale(rule.upperInflectionPoint.value);
      return rule;
  }
}

function changeCFRuleThresholdLocale<T extends IconThreshold | ColorScaleThreshold>(
  threshold: T,
  changeContentLocale: (content: string) => string
): T {
  if (!threshold?.value) {
    return threshold;
  }

  const value = threshold.type === "formula" ? "=" + threshold.value : threshold.value;
  const modified = changeContentLocale(value);
  const newValue = threshold.type === "formula" ? modified.slice(1) : modified;
  return { ...threshold, value: newValue };
}

export function getDateTimeFormat(locale: Locale) {
  return locale.dateFormat + " " + locale.timeFormat;
}
