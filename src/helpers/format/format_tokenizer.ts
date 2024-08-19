import { TokenizingChars } from "../misc";

export interface DigitToken {
  type: "DIGIT";
  value: "0" | "#";
}

export interface DecimalPointToken {
  type: "DECIMAL_POINT";
  value: ".";
}

export interface StringToken {
  type: "STRING";
  value: string;
}

export interface CharToken {
  type: "CHAR";
  value: string;
}

export interface PercentToken {
  type: "PERCENT";
  value: "%";
}

export interface ThousandsSeparatorToken {
  type: "THOUSANDS_SEPARATOR";
  value: ",";
}

export interface TextPlaceholderToken {
  type: "TEXT_PLACEHOLDER";
  value: "@";
}

export interface DatePartToken {
  type: "DATE_PART";
  value: string;
}

export interface RepeatCharToken {
  type: "REPEATED_CHAR";
  value: string;
}

export type FormatToken =
  | DigitToken
  | DecimalPointToken
  | StringToken
  | CharToken
  | PercentToken
  | ThousandsSeparatorToken
  | TextPlaceholderToken
  | DatePartToken
  | RepeatCharToken;

export function tokenizeFormat(str: string): FormatToken[][] {
  const chars = new TokenizingChars(str);
  const result: FormatToken[][] = [];

  let currentFormatPart: FormatToken[] = [];
  result.push(currentFormatPart);

  while (!chars.isOver()) {
    if (chars.current === ";") {
      currentFormatPart = [];
      result.push(currentFormatPart);
      chars.shift();
      continue;
    }
    let token =
      tokenizeDigit(chars) ||
      tokenizeString(chars) ||
      tokenizeEscapedChars(chars) ||
      tokenizeThousandsSeparator(chars) ||
      tokenizeDecimalPoint(chars) ||
      tokenizePercent(chars) ||
      tokenizeDatePart(chars) ||
      tokenizeTextPlaceholder(chars) ||
      tokenizeRepeatedChar(chars);

    if (!token) {
      throw new Error("Unknown token at " + chars.remaining());
    }

    currentFormatPart.push(token);
  }
  return result;
}

function tokenizeString(chars: TokenizingChars): FormatToken | null {
  let enfOfStringChar: string | undefined;
  if (chars.current === '"') {
    chars.shift();
    enfOfStringChar = '"';
  } else if (chars.currentStartsWith("[$")) {
    chars.advanceBy(2);
    enfOfStringChar = "]";
  }

  if (!enfOfStringChar) {
    return null;
  }
  let letters: string = "";
  while (chars.current && chars.current !== enfOfStringChar) {
    letters += chars.shift();
  }
  if (chars.current === enfOfStringChar) {
    chars.shift();
  } else {
    throw new Error("Unterminated string in format");
  }
  return {
    type: "STRING",
    value: letters,
  };
}

export const alwaysEscapedCharsInFormat = new Set("$+-/():!^&~{}<>= ");

function tokenizeEscapedChars(chars: TokenizingChars): FormatToken | null {
  if (chars.current === "\\") {
    chars.shift();
    const escapedChar = chars.shift();
    if (!escapedChar) {
      throw new Error("Unexpected end of format string");
    }
    return {
      type: "CHAR",
      value: escapedChar,
    };
  }
  if (alwaysEscapedCharsInFormat.has(chars.current)) {
    return {
      type: "CHAR",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeThousandsSeparator(chars: TokenizingChars): FormatToken | null {
  if (chars.current === ",") {
    chars.shift();
    return { type: "THOUSANDS_SEPARATOR", value: "," };
  }
  return null;
}

function tokenizeTextPlaceholder(chars: TokenizingChars): FormatToken | null {
  if (chars.current === "@") {
    chars.shift();
    return { type: "TEXT_PLACEHOLDER", value: "@" };
  }
  return null;
}

function tokenizeDecimalPoint(chars: TokenizingChars): FormatToken | null {
  if (chars.current === ".") {
    chars.shift();
    return { type: "DECIMAL_POINT", value: "." };
  }
  return null;
}

function tokenizePercent(chars: TokenizingChars): FormatToken | null {
  if (chars.current === "%") {
    chars.shift();
    return { type: "PERCENT", value: "%" };
  }
  return null;
}

function tokenizeDigit(chars: TokenizingChars): FormatToken | null {
  if (chars.current === "0" || chars.current === "#") {
    const value = chars.current;
    chars.shift();
    return { type: "DIGIT", value };
  }
  return null;
}

const dateSymbols = new Set("dmqyhsa");

function tokenizeDatePart(chars: TokenizingChars): FormatToken | null {
  if (!dateSymbols.has(chars.current)) {
    return null;
  }
  const char = chars.current;
  let value = "";
  while (chars.current === char) {
    value += chars.shift();
  }
  return { type: "DATE_PART", value };
}

function tokenizeRepeatedChar(chars: TokenizingChars): FormatToken | null {
  if (chars.current !== "*") {
    return null;
  }

  chars.shift();
  const repeatedChar = chars.shift();
  if (!repeatedChar) {
    throw new Error("Unexpected end of format string");
  }
  return {
    type: "REPEATED_CHAR",
    value: repeatedChar,
  };
}
