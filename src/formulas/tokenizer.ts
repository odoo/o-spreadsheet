import { functionRegistry } from "../functions/index";

const functions = functionRegistry.content;
// -----------------------------------------------------------------------------
// Tokenizer
// -----------------------------------------------------------------------------
const OPERATORS = "+,-,*,/,:,=,>=,>,<=,<,%,^".split(",");

export type TokenType =
  | "OPERATOR"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "FUNCTION"
  | "SYMBOL"
  | "SPACE"
  | "DEBUGGER"
  | "COMMA"
  | "LEFT_PAREN"
  | "RIGHT_PAREN"
  | "UNKNOWN";

export interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(str: string): Token[] {
  const chars = str.split("");
  const result: Token[] = [];
  let tokenCount = 0;
  while (chars.length) {
    tokenCount++;
    if (tokenCount > 100) {
      throw new Error("Wow that's big... (that's what she said)");
    }
    let token =
      tokenizeDebugger(chars) ||
      tokenizeSpace(chars) ||
      tokenizeMisc(chars) ||
      tokenizeOperator(chars) ||
      tokenizeNumber(chars) ||
      tokenizeString(chars) ||
      tokenizeSymbol(chars);

    if (!token) {
      token = { type: "UNKNOWN", value: chars.shift()! };
    }

    result.push(token);
  }
  return result;
}

function tokenizeDebugger(chars: string[]): Token | null {
  if (chars[0] === "?") {
    chars.shift();
    return { type: "DEBUGGER", value: "?" };
  }
  return null;
}

function tokenizeMisc(chars: string[]): Token | null {
  const misc = {
    ",": "COMMA",
    "(": "LEFT_PAREN",
    ")": "RIGHT_PAREN",
  } as const;
  if (chars[0] in misc) {
    const value = chars[0];
    const type = misc[chars.shift() as string] as "COMMA" | "LEFT_PAREN" | "RIGHT_PAREN";
    return { type, value };
  }
  return null;
}

function startsWith(chars: string[], op: string): boolean {
  for (let i = 0; i < op.length; i++) {
    if (op[i] !== chars[i]) {
      return false;
    }
  }
  return true;
}
function tokenizeOperator(chars: string[]): Token | null {
  for (let op of OPERATORS) {
    if (startsWith(chars, op)) {
      chars.splice(0, op.length);
      return { type: "OPERATOR", value: op };
    }
  }
  return null;
}

function tokenizeNumber(chars: string[]): Token | null {
  const digits: any[] = [];
  while (chars[0] && chars[0].match(/\d|\./)) {
    digits.push(chars.shift());
  }
  if (digits.length) {
    return {
      type: "NUMBER",
      value: digits.join(""),
    };
  }
  return null;
}

function tokenizeString(chars: string[]): Token | null {
  if (chars[0] === '"') {
    const startChar = chars.shift();
    const letters: any[] = [];
    letters.push(startChar);
    while (chars[0] && (chars[0] !== startChar || letters[letters.length - 1] === "\\")) {
      letters.push(chars.shift());
    }
    if (chars[0] === '"') {
      letters.push(chars.shift());
    }
    return {
      type: "STRING",
      value: letters.join(""),
    };
  }
  return null;
}

/**
 * A "Symbol" is just basically any word-like element that can appear in a
 * formula, which is not a string. So:
 *   A1
 *   SUM
 *   CEILING.MATH
 *   A$1
 *   Sheet2!A2
 *   'Sheet 2'!A2
 *
 * are examples of symbols
 */
function tokenizeSymbol(chars: string[]): Token | null {
  const result: any[] = [];
  // there are two main cases to manage: either something which starts with
  // a ', like 'Sheet 2'A2, or a word-like element.
  if (chars[0] === "'") {
    result.push(chars.shift());
    while (chars[0]) {
      let char = chars.shift();
      result.push(char);
      if (char === "'") {
        if (chars[0] && chars[0] === "'") {
          result.push(chars.shift());
        } else {
          break;
        }
      }
    }

    if (result[result.length - 1] !== "'") {
      return {
        type: "UNKNOWN",
        value: result.join(""),
      };
    }
  }
  while (chars[0] && chars[0].match(/\w|\.|!|\$/)) {
    result.push(chars.shift());
  }
  if (result.length) {
    const value = result.join("");
    const isFunction = value.toUpperCase() in functions;
    const type = isFunction ? "FUNCTION" : "SYMBOL";
    return { type, value };
  }
  return null;
}

function tokenizeSpace(chars: string[]): Token | null {
  let length = 0;
  while (chars[0] && chars[0].match(/\s/)) {
    length++;
    chars.shift();
  }

  if (length) {
    return { type: "SPACE", value: " ".repeat(length) };
  }
  return null;
}
