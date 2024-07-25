import { TokenizingChars } from "../misc";

export interface DigitToken {
  type: "DIGIT";
  value: "0" | "#";
}

export interface DecimalPointToken {
  type: "DECIMAL_POINT";
  value: string;
}

export interface EscapedStringToken {
  type: "ESCAPED_STRING";
  value: string;
}

export interface CharToken {
  type: "CHAR";
  value: string;
}

export interface PercentToken {
  type: "PERCENT";
  value: string;
}

export interface ThousandsSeparatorToken {
  type: "THOUSANDS_SEPARATOR";
  value: string;
}

export interface TextPlaceholderToken {
  type: "TEXT_PLACEHOLDER";
  value: string;
}

export interface DatePartToken {
  type: "DATE_PART";
  value: string;
}

export type FormatToken =
  | DigitToken
  | DecimalPointToken
  | EscapedStringToken
  | CharToken
  | PercentToken
  | ThousandsSeparatorToken
  | TextPlaceholderToken
  | DatePartToken;

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
      tokenizeTextPlaceholder(chars);

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
    type: "ESCAPED_STRING",
    value: letters,
  };
}

const alwaysEscapedChars = new Set("$+-/():!^&~{}<>= ");

export function shouldEscapeFormatChar(char: string): boolean {
  return !alwaysEscapedChars.has(char);
}

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
  if (alwaysEscapedChars.has(chars.current)) {
    return {
      type: "CHAR",
      value: chars.shift(),
    };
  }
  return null;
}

function tokenizeThousandsSeparator(chars: TokenizingChars): FormatToken | null {
  return chars.current === "," ? { type: "THOUSANDS_SEPARATOR", value: chars.shift() } : null;
}

function tokenizeTextPlaceholder(chars: TokenizingChars): FormatToken | null {
  return chars.current === "@" ? { type: "TEXT_PLACEHOLDER", value: chars.shift() } : null;
}

function tokenizeDecimalPoint(chars: TokenizingChars): FormatToken | null {
  return chars.current === "." ? { type: "DECIMAL_POINT", value: chars.shift() } : null;
}

function tokenizePercent(chars: TokenizingChars): FormatToken | null {
  return chars.current === "%" ? { type: "PERCENT", value: chars.shift() } : null;
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
