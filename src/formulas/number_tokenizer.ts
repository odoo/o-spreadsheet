import { NEWLINE } from "../constants";
import { Locale } from "../types";
import { TokenizingChars } from "./tokenizer";

type NumberTokenType =
  | "SPACE"
  | "DIGIT"
  | "DECIMAL_SEPARATOR"
  | "SIGN"
  | "PERCENT"
  | "THOUSANDS_SEPARATOR"
  | "CURRENCY"
  | "EXPONENT";

const POSSIBLE_DIGIT = new Set("0123456789");
const POSSIBLE_SIGN = new Set("+-");
const POSSIBLE_CURRENCY = new Set("€$");

export interface NumberToken {
  readonly type: NumberTokenType;
  readonly value: string;
}

export function tokenizeNumber(chars: TokenizingChars, locale: Locale): NumberToken[] {
  const result: NumberToken[] = [];
  while (!chars.isOver()) {
    let token =
      tokenizeSpace(chars) ||
      tokenizeDigit(chars) ||
      tokenizeDecimalSeparator(chars, locale) ||
      tokenizeSign(chars) ||
      tokenizePercent(chars) ||
      tokenizeThousandsSeparator(chars, locale) ||
      tokenizeCurrency(chars) ||
      tokenizeExponent(chars);
    if (!token) {
      return result;
    }
    result.push(token);
  }
  return result;
}

function tokenizeSpace(chars: TokenizingChars): NumberToken | null {
  let length = 0;
  while (chars.current === NEWLINE) {
    length++;
    chars.shift();
  }
  if (length) {
    return { type: "SPACE", value: NEWLINE.repeat(length) };
  }
  while (chars.current === " ") {
    length++;
    chars.shift();
  }
  if (length) {
    return { type: "SPACE", value: " ".repeat(length) };
  }
  return null;
}

function tokenizeDigit(chars: TokenizingChars): NumberToken | null {
  if (POSSIBLE_DIGIT.has(chars.current)) {
    return {
      type: "DIGIT",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeDecimalSeparator(chars: TokenizingChars, locale: Locale): NumberToken | null {
  if (chars.current === locale.decimalSeparator) {
    return {
      type: "DECIMAL_SEPARATOR",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeSign(chars: TokenizingChars): NumberToken | null {
  if (POSSIBLE_SIGN.has(chars.current)) {
    return {
      type: "SIGN",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizePercent(chars: TokenizingChars): NumberToken | null {
  if (chars.current === "%") {
    return {
      type: "PERCENT",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeThousandsSeparator(chars: TokenizingChars, locale: Locale): NumberToken | null {
  if (chars.current === locale.thousandsSeparator) {
    return {
      type: "THOUSANDS_SEPARATOR",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeCurrency(chars: TokenizingChars): NumberToken | null {
  if (POSSIBLE_CURRENCY.has(chars.current)) {
    return {
      type: "CURRENCY",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeExponent(chars: TokenizingChars): NumberToken | null {
  if (chars.current.toLowerCase() === "e") {
    return {
      type: "EXPONENT",
      value: chars.shift(),
    };
  }
  return null;
}

// type ParserResult = {
//     value: number
//     tokensToShift: number,
// }
type NumberFunction = (...digits: string[]) => number;
const numberFunctionCache: { [key: string]: NumberFunction | null } = {};

export function compileNumberTokens(numberTokens: NumberToken[]): number | null {
  const cacheKey = compilationNumberCacheKey(numberTokens);
  if (numberFunctionCache[cacheKey] === undefined) {
    const computeNumber = parseNumberTokens(numberTokens);
    numberFunctionCache[cacheKey] = numberTokens.length ? null : computeNumber;
  }
  const computeNumber = numberFunctionCache[cacheKey];
  if (computeNumber === null) {
    return null;
  }
  return computeNumber(...digitArguments(numberTokens));
}

function compilationNumberCacheKey(numberTokens: NumberToken[]) {
  let cacheKey = "";

  for (let token of numberTokens) {
    switch (token.type) {
      case "SPACE":
        cacheKey += " ";
        break;
      case "DIGIT":
        cacheKey += "0";
        break;
      case "DECIMAL_SEPARATOR":
        cacheKey += ".";
        break;
      case "SIGN":
        cacheKey += token.value;
        break;
      case "PERCENT":
        cacheKey += "%";
        break;
      case "THOUSANDS_SEPARATOR":
        cacheKey += ",";
        break;
      case "CURRENCY":
        cacheKey += "€";
        break;
      case "EXPONENT":
        cacheKey += "e";
        break;
    }
  }

  return cacheKey;
}

function digitArguments(numberTokens: NumberToken[]): string[] {
  const numberTokensValues: string[] = [];
  for (let token of numberTokens) {
    if (token.type === "DIGIT") {
      numberTokensValues.push(token.value);
    }
  }
  return numberTokensValues;
}

export function parseNumberTokens(numberTokens: NumberToken[]): NumberFunction | null {
  let computeValue: NumberFunction = () => 0;

  // We are at the highest level of what a number looks like
  // At this stage, we can find three sub-part composing a number:
  // part 1: a sign part
  // part 2: a value part (composing of digits and other things...)
  // part 3: a currency part

  // for the number to be valid:
  // - each part can be found at most once
  // - part 1 is optional, if desired it must always be upstream of part 2
  // - part 2 is mandatory
  // - part 3 is optional and can be found anywhere
  // - there can be as much space as you want between each part

  let valueAlreadyFound = false;
  let minusAlreadyFound = false;
  let currencyAlreadyFound = false;

  const currentTokens = [...numberTokens];

  while (currentTokens.length) {
    // PART 2 ////////////////
    const computeValueFn = parseValueTokens(currentTokens);
    if (computeValueFn !== null) {
      if (valueAlreadyFound) {
        return null;
      }
      computeValue = computeValueFn;
      valueAlreadyFound = true;
      continue;
    }

    // PART 1 ////////////////
    if (currentTokens[0].type === "SIGN") {
      if (minusAlreadyFound || valueAlreadyFound) {
        return null;
      }
      currentTokens.shift();
      minusAlreadyFound = true;
      continue;
    }

    // PART SPACE ////////////////
    if (currentTokens[0].type === "SPACE") {
      currentTokens.shift();
      continue;
    }

    // PART 3 ////////////////
    if (currentTokens[0].type === "CURRENCY") {
      if (currencyAlreadyFound) {
        return null;
      }
      currentTokens.shift();
      currencyAlreadyFound = true;
      continue;
    }

    break;
  }

  if (valueAlreadyFound) {
    numberTokens.splice(0, numberTokens.length, ...currentTokens);
    return minusAlreadyFound ? (...digits) => -computeValue(...digits) : computeValue;
  }
  return null;
}

function parseValueTokens(valueTokens: NumberToken[]): NumberFunction | null {
  const currentTokens = [...valueTokens];

  let computeDigits: NumberFunction = () => 0;
  let computeExponent: NumberFunction = () => 0;

  // We are at the value level of what a number looks like
  // At this stage, we can find three sub-part composing a value:
  // part 1: a digital part (composing of digits)
  // part 2: a scientific part
  // part 3: a percentage part

  // for the value to be valid:
  // - each part can be found at most once
  // - part 1 is mandatory
  // - part 2 is optional, if desired it must always be downstream of part 1
  // - part 3 is optional, if desired it must always be downstream of part 1 and 2
  // - there can be as much space as you want between each part

  let digitsValueAlreadyFound = false;
  let exponentAlreadyFound = false;
  let percentAlreadyFound = false;

  let countDigitsForValue = 0;

  while (currentTokens.length) {
    const digitsBeforeParsing = currentTokens.reduce(
      (acc, t) => (t.type === "DIGIT" ? acc + 1 : acc),
      0
    );

    // PART 1 ///////////////////
    const computeNumeralFn = parseNumeralTokens(currentTokens);
    if (computeNumeralFn !== null) {
      if (digitsValueAlreadyFound) {
        return null;
      }
      digitsValueAlreadyFound = true;
      const digitsAfterParsing = currentTokens.reduce(
        (acc, t) => (t.type === "DIGIT" ? acc++ : acc),
        0
      );
      countDigitsForValue = digitsBeforeParsing - digitsAfterParsing;
      computeDigits = (...digits) => computeNumeralFn(...digits.slice(0, countDigitsForValue));
      continue;
    }

    // PART 2 ///////////////////
    const computeExponentFn = parseExponentTokens(currentTokens);
    if (computeExponentFn !== null) {
      if (!digitsValueAlreadyFound || exponentAlreadyFound || percentAlreadyFound) {
        return null;
      }
      exponentAlreadyFound = true;
      const digitsAfterParsing = currentTokens.reduce(
        (acc, t) => (t.type === "DIGIT" ? acc++ : acc),
        0
      );
      const countDigitsForExponent = digitsBeforeParsing - digitsAfterParsing;
      computeExponent = (...digits) =>
        computeExponentFn(...digits.slice(countDigitsForValue, countDigitsForExponent));
      continue;
    }

    // PART 3 ///////////////////
    if (currentTokens[0].type === "PERCENT") {
      if (!digitsValueAlreadyFound || percentAlreadyFound) {
        return null;
      }
      percentAlreadyFound = true;
      currentTokens.shift();
      continue;
    }

    // PART SPACE ///////////////////
    if (currentTokens[0].type === "SPACE") {
      currentTokens.shift();
      continue;
    }

    break;
  }

  if (digitsValueAlreadyFound) {
    valueTokens.splice(0, valueTokens.length, ...currentTokens);

    if (!(percentAlreadyFound || exponentAlreadyFound)) {
      return computeDigits;
    }
    if (percentAlreadyFound) {
      computeExponent = (...digits) => computeExponent(...digits) - 2;
    }
    return (...digits) => computeDigits(...digits) * 10 ** computeExponent(...digits);
  }
  return null;
}

function parseNumeralTokens(numeralTokens: NumberToken[]): NumberFunction | null {
  const currentTokens = [...numeralTokens];

  let computeInteger: (...digits: string[]) => string = () => "";
  let computeDecimal: (...digits: string[]) => string = () => "";

  // We are at the numeral level of what a number looks like
  // At this stage, we can find four sub-part composing a numeral:
  // part 1: a integer part composing of digits and thousand separators
  // part 2: a decimal separator part
  // part 3: a decimal part composing of digits

  // for the numeral to be valid:
  // - each part can be found at most once
  // - part 1 is optional
  // - part 2 is optional but mandatory if part 3 exist
  // - part 3 is optional
  // - at least one of part 1 or part 2 is mandatory

  let integerAlreadyFound = false;
  let decimalSeparatorAlreadyFound = false;
  let decimalAlreadyFound = false;

  let countDigitsForInteger = 0;

  let digitsAfterParsing = 0;
  while (currentTokens.length) {
    const digitsBeforeParsing = currentTokens.reduce(
      (acc, t) => (t.type === "DIGIT" ? acc + 1 : acc),
      0
    );

    // PART 1 ///////////////////
    if (!integerAlreadyFound || !decimalSeparatorAlreadyFound) {
      const computeIntegerFn = parseIntegerTokens(currentTokens);
      if (computeIntegerFn !== null) {
        integerAlreadyFound = true;
        const digitsAfterParsing = currentTokens.reduce(
          (acc, t) => (t.type === "DIGIT" ? acc + 1 : acc),
          0
        );
        countDigitsForInteger = digitsBeforeParsing - digitsAfterParsing;
        computeInteger = (...digits) => computeIntegerFn(...digits.slice(0, countDigitsForInteger));
        continue;
      }
    }

    // PART 2 ///////////////////
    if (currentTokens[0].type === "DECIMAL_SEPARATOR") {
      if (decimalSeparatorAlreadyFound === true) {
        return null;
      }
      decimalSeparatorAlreadyFound = true;
      currentTokens.shift();
      continue;
    }

    // PART 3 ///////////////////
    const computeDecimalFn = parseDecimalTokens(currentTokens);
    if (computeDecimalFn !== null) {
      if (!decimalSeparatorAlreadyFound) {
        return null;
      }
      decimalAlreadyFound = true;
      computeDecimal = (...digits) => computeDecimalFn(...digits.slice(digitsAfterParsing));
      continue;
    }

    break;
  }

  if (integerAlreadyFound || decimalAlreadyFound) {
    numeralTokens.splice(0, numeralTokens.length, ...currentTokens);

    if (!decimalAlreadyFound) {
      return (...digits) => Number(computeInteger(...digits));
    }
    if (!integerAlreadyFound) {
      return (...digits) => Number("." + computeDecimal(...digits));
    }
    return (...digits) => Number(computeInteger(...digits) + "." + computeDecimal(...digits));
  }
  return null;
}

function parseIntegerTokens(
  integerTokens: NumberToken[]
): ((...digits: string[]) => string) | null {
  const currentTokens = [...integerTokens];

  let countDigits = 0;

  let digitsAlreadyFound = false;
  let thousandsSeparatorAlreadyFound = false;

  while (currentTokens.length) {
    if (currentTokens[0].type === "DIGIT") {
      countDigits++;
      digitsAlreadyFound = true;
      currentTokens.shift();
      continue;
    }

    if (currentTokens[0].type === "THOUSANDS_SEPARATOR") {
      if (thousandsSeparatorAlreadyFound && countDigits < 3) {
        return null;
      }
      countDigits = 0;
      currentTokens.shift();
      thousandsSeparatorAlreadyFound = true;
      continue;
    }
    break;
  }

  if (digitsAlreadyFound) {
    integerTokens.splice(0, integerTokens.length, ...currentTokens);
    return (...args) => args.join("");
  }
  return null;
}

function parseDecimalTokens(
  decimalTokens: NumberToken[]
): ((...digits: string[]) => string) | null {
  const currentTokens = [...decimalTokens];
  let digitsFound = false;
  while (currentTokens.length) {
    if (currentTokens[0].type === "DIGIT") {
      digitsFound = true;
      currentTokens.shift();
      continue;
    }
    break;
  }
  if (digitsFound) {
    decimalTokens.splice(0, decimalTokens.length, ...currentTokens);
    return (...digits: string[]) => digits.join("");
  }
  return null;
}

function parseExponentTokens(exponentTokens: NumberToken[]): NumberFunction | null {
  let computeExponentIndexTokens: NumberFunction = () => 0;

  // We are at the exponent level of what a number looks like
  // At this stage, we can find three sub-part composing an exponent:
  // part 1: an 'e' symbol
  // part 2: a sign
  // part 3: a number

  // for the exponent to be valid:
  // - each part can be found at most once
  // - part 1 is mandatory
  // - part 2 is optional, if desired it must always be downstream of part 1
  // - part 3 is mandatory, if desired it must always be downstream of part 1 and 2

  let eSymbolAlreadyFound = false;
  let signFound: "+" | "-" | false = false;
  let exponentIndexAlreadyFound = false;

  const currentTokens = [...exponentTokens];

  while (currentTokens.length) {
    // PART 1 ///////////////////
    if (currentTokens[0].type === "EXPONENT") {
      if (eSymbolAlreadyFound) {
        return null;
      }
      currentTokens.shift();
      eSymbolAlreadyFound = true;
      continue;
    }

    // PART 2 ///////////////////
    if (currentTokens[0].type === "SIGN") {
      if (!eSymbolAlreadyFound || signFound) {
        return null;
      }
      signFound = currentTokens[0].value === "-" ? "-" : "+";
      currentTokens.shift();
      continue;
    }

    // PART 3 ///////////////////
    const computeExponentIndexTokensFn = parseExponentIndex(currentTokens);
    if (computeExponentIndexTokensFn !== null) {
      if (exponentIndexAlreadyFound) {
        return null;
      }
      exponentIndexAlreadyFound = true;
      computeExponentIndexTokens = computeExponentIndexTokensFn;
      continue;
    }

    break;
  }

  if (eSymbolAlreadyFound && exponentIndexAlreadyFound) {
    exponentTokens.splice(0, exponentTokens.length, ...currentTokens);
    if (signFound === "-") {
      return (...digits) => -computeExponentIndexTokens(...digits);
    }
    return computeExponentIndexTokens;
  }
  return null;
}

function parseExponentIndex(exponentIndexTokens: NumberToken[]): NumberFunction | null {
  let digitsFound = false;
  const currentTokens = [...exponentIndexTokens];
  while (currentTokens.length) {
    if (currentTokens[0].type === "DIGIT") {
      currentTokens.shift();
      digitsFound = true;
      continue;
    }
    break;
  }
  if (digitsFound) {
    exponentIndexTokens.splice(0, exponentIndexTokens.length, ...currentTokens);
    return (...digits: string[]) => parseInt(digits.join(""), 10);
  }
  return null;
}
