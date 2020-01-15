import { functions } from "../functions/index";

// -----------------------------------------------------------------------------
// Tokenizer
// -----------------------------------------------------------------------------
const OPERATORS = "+,-,*,/,:".split(",");

export type TokenType =
  | "OPERATOR"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "FUNCTION"
  | "VARIABLE"
  | "SPACE"
  | "FORMULA"
  | "DEBUGGER"
  | "COMMA"
  | "LEFT_PAREN"
  | "RIGHT_PAREN";

export interface Token {
  start: number;
  end: number;
  length: number;
  type: TokenType;
  value: any;
}

export function tokenize(str: string): Token[] {
  const chars = str.split("");
  const result: Token[] = [];
  let i = 0;

  while (chars.length) {
    let token =
      tokenizeFormula(chars) ||
      tokenizeDebugger(chars) ||
      tokenizeSpace(chars) ||
      tokenizeMisc(chars) ||
      tokenizeOperator(chars) ||
      tokenizeNumber(chars) ||
      tokenizeString(chars) ||
      tokenizeBoolean(chars) ||
      tokenizeSymbol(chars);
    if (!token) {
      throw new Error("Tokenizer error");
    }
    token.start = i;
    token.end = i + token.length;
    i += token.length;
    result.push(token);
  }
  return result;
}

function tokenizeFormula(chars: string[]): Token | null {
  if (chars[0] === "=") {
    chars.shift();
    return { start: 0, end: 1, length: 1, type: "FORMULA", value: "=" };
  }
  return null;
}

function tokenizeDebugger(chars: string[]): Token | null {
  if (chars[0] === "?") {
    chars.shift();
    return { start: 1, end: 2, length: 1, type: "DEBUGGER", value: "?" };
  }
  return null;
}

function tokenizeMisc(chars): Token | null {
  const misc = {
    ",": "COMMA",
    "(": "LEFT_PAREN",
    ")": "RIGHT_PAREN"
  } as const;
  if (chars[0] in misc) {
    const value = chars[0];
    const type = misc[chars.shift()] as "COMMA" | "LEFT_PAREN" | "RIGHT_PAREN";
    return { type, value, length: 1, start: 0, end: 0 };
  }
  return null;
}

function tokenizeOperator(chars): Token | null {
  if (OPERATORS.includes(chars[0])) {
    return { type: "OPERATOR", value: chars.shift(), length: 1, start: 0, end: 0 };
  }
  return null;
}

function tokenizeNumber(chars): Token | null {
  const digits: any[] = [];
  while (chars[0] && chars[0].match(/\d|\./)) {
    digits.push(chars.shift());
  }
  if (digits.length) {
    return {
      type: "NUMBER",
      value: parseFloat(digits.join("")),
      length: digits.length,
      start: 0,
      end: 0
    };
  }
  return null;
}

function tokenizeBoolean(chars): Token | null {
  if (["T", "F"].includes(chars[0].toUpperCase())) {
    for (let value of ["TRUE", "FALSE"]) {
      if (
        chars
          .slice(0, value.length)
          .join("")
          .toUpperCase() === value
      ) {
        chars.splice(0, value.length);
        return {
          type: "BOOLEAN",
          value: value === "TRUE",
          length: value.length,
          start: 0,
          end: 0
        };
      }
    }
  }
  return null;
}

function tokenizeString(chars): Token | null {
  const quotes = ["'", '"'];
  if (quotes.includes(chars[0])) {
    const startChar = chars.shift();
    const letters: any[] = [];
    while (chars[0] && (chars[0] !== startChar || letters[letters.length - 1] === "\\")) {
      letters.push(chars.shift());
    }
    chars.shift();
    return {
      type: "STRING",
      value: letters.join(""),
      length: letters.length + 2, //Takes the quotes
      start: 0,
      end: 0
    };
  }
  return null;
}

function tokenizeSymbol(chars): Token | null {
  const result: any[] = [];
  while (chars[0] && chars[0].match(/\w/)) {
    result.push(chars.shift());
  }
  if (result.length) {
    const value = result.join("").toUpperCase();
    const isFunction = value in functions;
    const type = isFunction ? "FUNCTION" : "VARIABLE";
    return { type, value, length: result.length, start: 0, end: 0 };
  }
  return null;
}

function tokenizeSpace(chars): Token | null {
  let length = 0;
  while (chars[0] && chars[0].match(/\s/)) {
    length++;
    chars.shift();
  }

  if (length) {
    return { type: "SPACE", value: " ".repeat(length), length, start: 0, end: 0 };
  }
  return null;
}
