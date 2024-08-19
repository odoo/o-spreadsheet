import { Format } from "../../types";
import { insertItemsAtIndex, isDefined } from "../misc";
import {
  CharToken,
  DatePartToken,
  DecimalPointToken,
  DigitToken,
  EscapedStringToken,
  FormatToken,
  PercentToken,
  RepeatCharToken,
  TextPlaceholderToken,
  ThousandsSeparatorToken,
  shouldEscapeFormatChar,
  tokenizeFormat,
} from "./format_tokenize";

/**
 *  Constant used to indicate the maximum of digits that is possible to display
 *  in a cell with standard size.
 */
export const MAX_DECIMAL_PLACES = 20;

export interface MultiPartInternalFormat {
  positive: NumberInternalFormat | DateInternalFormat | TextInternalFormat;
  negative?: NumberInternalFormat | DateInternalFormat;
  zero?: NumberInternalFormat | DateInternalFormat;
  text?: TextInternalFormat;
}

export interface DateInternalFormat {
  type: "date";
  tokens: (DatePartToken | DecimalPointToken | EscapedStringToken | CharToken | RepeatCharToken)[];
}

export interface NumberInternalFormat {
  type: "number";
  readonly integerPart: (
    | DigitToken
    | EscapedStringToken
    | CharToken
    | PercentToken
    | RepeatCharToken
  )[];
  readonly percentSymbols: number;
  readonly thousandsSeparator: boolean;
  /** A thousand separator after the last digit in the format means that we divide the number by a thousand */
  readonly magnitude: number;
  /**
   * optional because we need to differentiate a number
   * with a dot but no decimals with a number without any decimals.
   * i.e. '5.'  !=== '5' !=== '5.0'
   */
  readonly decimalPart?: (
    | DigitToken
    | EscapedStringToken
    | CharToken
    | PercentToken
    | RepeatCharToken
  )[];
}

export interface TextInternalFormat {
  type: "text";
  tokens: (EscapedStringToken | CharToken | TextPlaceholderToken | RepeatCharToken)[];
}

export type InternalFormat = NumberInternalFormat | DateInternalFormat | TextInternalFormat;

const internalFormatCache: { [format: string]: MultiPartInternalFormat } = {};

export function parseFormat(formatString: Format): MultiPartInternalFormat {
  let internalFormat = internalFormatCache[formatString];
  if (internalFormat === undefined) {
    internalFormat = convertFormatToInternalFormat(formatString);
    internalFormatCache[formatString] = internalFormat;
  }
  return internalFormat;
}

export function convertFormatToInternalFormat(format: Format): MultiPartInternalFormat {
  const formatParts = tokenizeFormat(format);

  // A format can only have a single REPEATED_CHAR token. The rest are converted to simple CHAR tokens.
  for (const part of formatParts) {
    const repeatedCharTokens = part.filter((token) => token.type === "REPEATED_CHAR");
    for (const repeatedCharToken of repeatedCharTokens.slice(1)) {
      repeatedCharToken.type = "CHAR";
    }
  }

  const positiveFormat =
    parseDateFormatTokens(formatParts[0]) ||
    parseNumberFormatTokens(formatParts[0]) ||
    tokensToTextInternalFormat(formatParts[0]);
  if (!positiveFormat) {
    throw new Error("Invalid first format part of: " + format);
  }
  if (formatParts.length > 1 && positiveFormat.type === "text") {
    throw new Error("The first format in a multi part format must be a number format: " + format);
  }

  const negativeFormat =
    parseDateFormatTokens(formatParts[1]) || parseNumberFormatTokens(formatParts[1]);
  if (formatParts[1]?.length && !negativeFormat) {
    throw new Error("Invalid second format part of: " + format);
  }

  const zeroFormat =
    parseDateFormatTokens(formatParts[2]) || parseNumberFormatTokens(formatParts[2]);
  if (formatParts[2]?.length && !zeroFormat) {
    throw new Error("Invalid third format part of: " + format);
  }

  const textFormat = tokensToTextInternalFormat(formatParts[3]);
  if (formatParts[3]?.length && !textFormat) {
    throw new Error("Invalid fourth format part of: " + format);
  }

  return { positive: positiveFormat, negative: negativeFormat, zero: zeroFormat, text: textFormat };
}

function areValidDateFormatTokens(tokens: FormatToken[]): tokens is DateInternalFormat["tokens"] {
  return tokens.every(
    (token) =>
      token.type === "DATE_PART" ||
      token.type === "DECIMAL_POINT" ||
      token.type === "ESCAPED_STRING" ||
      token.type === "CHAR" ||
      token.type === "REPEATED_CHAR"
  );
}

function areValidNumberFormatTokens(
  tokens: FormatToken[]
): tokens is (
  | DigitToken
  | DecimalPointToken
  | ThousandsSeparatorToken
  | PercentToken
  | EscapedStringToken
  | CharToken
  | RepeatCharToken
)[] {
  return tokens.every(
    (token) =>
      token.type === "DIGIT" ||
      token.type === "DECIMAL_POINT" ||
      token.type === "THOUSANDS_SEPARATOR" ||
      token.type === "PERCENT" ||
      token.type === "ESCAPED_STRING" ||
      token.type === "CHAR" ||
      token.type === "REPEATED_CHAR"
  );
}

function areValidTextFormatTokens(tokens: FormatToken[]): tokens is TextInternalFormat["tokens"] {
  return tokens.every(
    (token) =>
      token.type === "ESCAPED_STRING" ||
      token.type === "TEXT_PLACEHOLDER" ||
      token.type === "CHAR" ||
      token.type === "REPEATED_CHAR"
  );
}

function parseNumberFormatTokens(
  tokens: FormatToken[] | undefined
): NumberInternalFormat | undefined {
  if (!tokens || !areValidNumberFormatTokens(tokens)) {
    return undefined;
  }
  const integerPart: NumberInternalFormat["integerPart"] = [];
  let decimalPart: NumberInternalFormat["decimalPart"] = undefined;

  let parsedPart = integerPart;
  let percentSymbols = 0;
  let magnitude = 0;
  let lastIndexOfDigit = tokens.findLastIndex((token) => token.type === "DIGIT");
  let hasThousandSeparator = false;
  let numberOfDecimalsDigits = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.type) {
      case "DIGIT":
        if (parsedPart === integerPart) {
          parsedPart.push(token);
        } else if (numberOfDecimalsDigits < MAX_DECIMAL_PLACES) {
          parsedPart.push(token);
          numberOfDecimalsDigits++;
        }
        break;
      case "DECIMAL_POINT":
        if (parsedPart === integerPart) {
          decimalPart = [];
          parsedPart = decimalPart;
        } else {
          throw new Error("Multiple decimal points in a number format");
        }
        break;
      case "REPEATED_CHAR":
      case "CHAR":
      case "ESCAPED_STRING":
        parsedPart.push(token);
        break;
      case "PERCENT":
        percentSymbols++;
        parsedPart.push(token);
        break;
      // Per OpenXML Spec:
      // - If a comma is between two DIGIT tokens, and in the integer part, a thousand separator is applied in the formatted value.
      // - If a comma is at the end of the number placeholder, the number is divided by a thousand.
      // - Otherwise, it's a string.
      case "THOUSANDS_SEPARATOR":
        if (i - 1 === lastIndexOfDigit) {
          magnitude += 1;
          lastIndexOfDigit++; // Can have multiple commas in a row
        } else if (tokens[i + 1]?.type === "DIGIT" && tokens[i - 1]?.type === "DIGIT") {
          if (parsedPart === integerPart) {
            hasThousandSeparator = true;
          }
        } else {
          parsedPart.push({ type: "CHAR", value: "," });
        }
        break;
    }
  }

  return {
    type: "number",
    integerPart,
    decimalPart,
    percentSymbols,
    thousandsSeparator: hasThousandSeparator,
    magnitude,
  };
}

function parseDateFormatTokens(tokens: FormatToken[] | undefined): DateInternalFormat | undefined {
  const internalFormat =
    tokens && areValidDateFormatTokens(tokens) ? { type: "date", tokens } : undefined;
  if (!internalFormat) {
    return undefined;
  }
  if (
    internalFormat.tokens.length &&
    internalFormat.tokens.every((token) => token.type === "DATE_PART" && token.value === "a")
  ) {
    throw new Error("Invalid date format");
  }
  const convertedTokens = convertTokensToMinutesInDateFormat(internalFormat.tokens);
  return { type: "date", tokens: convertedTokens };
}

function tokensToTextInternalFormat(
  tokens: FormatToken[] | undefined
): TextInternalFormat | undefined {
  return tokens && areValidTextFormatTokens(tokens) ? { type: "text", tokens } : undefined;
}

/**
 * Replace in place tokens "mm" and "m" that denote minutes in date format with "MM" to avoid confusion with months.
 *
 * As per OpenXML specification, in date formats if a data token "m" or "mm" is followed by a date token "s" or
 * preceded by a data token "h", then it's not a month but an minute.
 */
function convertTokensToMinutesInDateFormat(tokens: DateInternalFormat["tokens"]) {
  const dateParts = tokens.filter((token) => token.type === "DATE_PART") as DatePartToken[];
  for (let i = 0; i < dateParts.length; i++) {
    if (!dateParts[i].value.startsWith("m") || dateParts[i].value.length > 2) {
      continue;
    }
    if (dateParts[i - 1]?.value.startsWith("h") || dateParts[i + 1]?.value.startsWith("s")) {
      dateParts[i].value = dateParts[i].value.replaceAll("m", "M");
    }
  }
  return tokens;
}

export function convertInternalFormatToFormat(internalFormat: MultiPartInternalFormat): Format {
  return [
    internalFormatPartToFormat(internalFormat.positive),
    internalFormatPartToFormat(internalFormat.negative),
    internalFormatPartToFormat(internalFormat.zero),
    internalFormatPartToFormat(internalFormat.text),
  ]
    .filter(isDefined)
    .join(";");
}

function internalFormatPartToFormat(
  internalFormat: InternalFormat | undefined
): Format | undefined {
  if (!internalFormat) {
    return undefined;
  }
  let format = "";
  const tokens =
    internalFormat.type !== "number"
      ? internalFormat.tokens
      : numberInternalFormatToTokenList(internalFormat);
  for (let token of tokens) {
    switch (token.type) {
      case "ESCAPED_STRING":
        format += `[$${token.value}]`;
        break;
      case "CHAR":
        format += shouldEscapeFormatChar(token.value) ? `\\${token.value}` : token.value;
        break;
      case "REPEATED_CHAR":
        format += "*" + token.value;
        break;
      default:
        format += token.value;
    }
  }
  return format;
}

function numberInternalFormatToTokenList(internalFormat: NumberInternalFormat): FormatToken[] {
  let tokens: FormatToken[] = [...internalFormat.integerPart];

  if (internalFormat.thousandsSeparator) {
    const index = tokens.findIndex(
      (token, i) => token.type === "DIGIT" && tokens[i + 1]?.type === "DIGIT"
    );
    tokens = insertItemsAtIndex(tokens, [{ type: "THOUSANDS_SEPARATOR", value: "," }], index + 1);
  }

  if (internalFormat.decimalPart) {
    tokens.push({ type: "DECIMAL_POINT", value: "." });
    tokens.push(...internalFormat.decimalPart);
  }

  if (internalFormat.magnitude) {
    const lastDigitIndex = tokens.findLastIndex((token) => token.type === "DIGIT");
    const tokensToAdd = new Array(internalFormat.magnitude).fill({
      type: "THOUSANDS_SEPARATOR",
      value: ",",
    });
    tokens = insertItemsAtIndex(tokens, tokensToAdd, lastDigitIndex + 1);
  }

  return tokens;
}
