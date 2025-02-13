import { isFormula } from "../helpers";
import { canonicalizeNumberLiteral } from "../helpers/locale";
import { DEFAULT_LOCALE, Locale } from "../types";
import { tokenize } from "./tokenizer";

/** Change a number string to its canonical form (en_US locale) */
export function canonicalizeNumberValue(content: string, locale: Locale) {
  return isFormula(content)
    ? canonicalizeFormula(content, locale)
    : canonicalizeNumberLiteral(content, locale);
}

/** Change a formula to its canonical form (en_US locale) */
function canonicalizeFormula(formula: string, locale: Locale) {
  return _localizeFormula(
    formula.startsWith("+") ? "=" + formula.slice(1) : formula,
    locale,
    DEFAULT_LOCALE
  );
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
