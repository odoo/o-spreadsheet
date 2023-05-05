import { tokenize } from "../formulas";
import {
  ColorScaleThreshold,
  ConditionalFormatRule,
  DEFAULT_LOCALE,
  IconThreshold,
  Locale,
} from "../types";
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

  try {
    formatValue(1, { locale, format: "#,##0.00" });
    formatValue(1, { locale, format: locale.dateFormat });
    formatValue(1, { locale, format: locale.timeFormat });
  } catch {
    return false;
  }
  return true;
}

/** Change a content string to its canonical form (en_US locale) */
export function canonicalizeContent(content: string, locale: Locale) {
  return content.startsWith("=")
    ? canonicalizeFormula(content, locale)
    : toCanonicalNumberString(content, locale);
}

/** Change the content of a cell to its canonical form (en_US locale) */
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
 *  Replace localized number with localized decimal separator by a number with "." as decimal separator
 */
export function toCanonicalNumberString(content: string, locale: Locale): string {
  if (locale.decimalSeparator === "." || !isNumber(content, locale)) {
    return content;
  }
  return content.replace(locale.decimalSeparator, ".");
}

function localizeLiteral(content: string, locale: Locale): string {
  if (locale.decimalSeparator === "." || !isNumber(content, DEFAULT_LOCALE)) {
    return content;
  }

  const decimalNumberRegex = getDecimalNumberRegex(DEFAULT_LOCALE);
  const localized = content.replace(decimalNumberRegex, (match) => {
    return match.replace(".", locale.decimalSeparator);
  });
  return localized;
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
