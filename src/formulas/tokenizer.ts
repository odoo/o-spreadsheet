import { FORMULA_REF_IDENTIFIER, INCORRECT_RANGE_STRING } from "../constants";
import { functionRegistry } from "../functions/index";
import { formulaNumberRegexp } from "../helpers/index";

/**
 * Tokenizer
 *
 * A tokenizer is a piece of code whose job is to transform a string into a list
 * of "tokens". For example, "(12+" is converted into:
 *   [{type: "LEFT_PAREN", value: "("},
 *    {type: "NUMBER", value: "12"},
 *    {type: "OPERATOR", value: "+"}]
 *
 * As the example shows, a tokenizer does not care about the meaning behind those
 * tokens. It only cares about the structure.
 *
 * The tokenizer is usually the first step in a compilation pipeline.  Also, it
 * is useful for the composer, which needs to be able to work with incomplete
 * formulas.
 */

const dependencyIdentifierRegex = /^[S|N]?\d+/;
const functions = functionRegistry.content;
const OPERATORS = "+,-,*,/,:,=,<>,>=,>,<=,<,%,^,&".split(",");

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
  | "REFERENCE"
  | "INVALID_REFERENCE"
  | "NORMALIZED_NUMBER"
  | "NORMALIZED_STRING"
  | "UNKNOWN";

export interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(str: string): Token[] {
  const chars = str.split("");
  const result: Token[] = [];

  while (chars.length) {
    let token =
      tokenizeSpace(chars) ||
      tokenizeMisc(chars) ||
      tokenizeOperator(chars) ||
      tokenizeString(chars) ||
      tokenizeDebugger(chars) ||
      tokenizeNormalizedReferences(chars) ||
      tokenizeInvalidRange(chars) ||
      tokenizeNumber(chars) ||
      tokenizeSymbol(chars);

    if (!token) {
      token = { type: "UNKNOWN", value: chars.shift()! };
    }

    result.push(token);
  }
  return result;
}

function tokenizeNormalizedReferences(chars: string[]): Token | null {
  if (chars[0] === FORMULA_REF_IDENTIFIER) {
    chars.shift(); // consume the | even if it is incorrect
    const match = chars.join("").match(dependencyIdentifierRegex);
    if (match) {
      chars.splice(0, match[0].length);
    } else {
      return null;
    }
    if (chars[0] === FORMULA_REF_IDENTIFIER) {
      chars.shift();
    }
    const value = match[0];
    switch (value[0]) {
      case "S":
        return { type: "NORMALIZED_STRING", value: value.substring(1) };
      case "N":
        return { type: "NORMALIZED_NUMBER", value: value.substring(1) };
      default:
        return { type: "REFERENCE", value };
    }
  }
  return null;
}

function tokenizeDebugger(chars: string[]): Token | null {
  if (chars[0] === "?") {
    chars.shift();
    return { type: "DEBUGGER", value: "?" };
  }
  return null;
}

const misc = {
  ",": "COMMA",
  "(": "LEFT_PAREN",
  ")": "RIGHT_PAREN",
} as const;

function tokenizeMisc(chars: string[]): Token | null {
  if (chars[0] in misc) {
    const value = chars.shift()!;
    const type = misc[value];
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
  const match = chars.join("").match(formulaNumberRegexp);
  if (match) {
    chars.splice(0, match[0].length);
    return { type: "NUMBER", value: match[0] };
  }
  return null;
}

function tokenizeString(chars: string[]): Token | null {
  if (chars[0] === '"') {
    const startChar = chars.shift();
    const letters: any[] = [startChar];
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

const separatorRegexp = /\w|\.|!|\$/;

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
    let lastChar = chars.shift();
    result.push(lastChar);
    while (chars[0]) {
      lastChar = chars.shift();
      result.push(lastChar);
      if (lastChar === "'") {
        if (chars[0] && chars[0] === "'") {
          lastChar = chars.shift();
          result.push(lastChar);
        } else {
          break;
        }
      }
    }

    if (lastChar !== "'") {
      return {
        type: "UNKNOWN",
        value: result.join(""),
      };
    }
  }
  while (chars[0] && chars[0].match(separatorRegexp)) {
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

const whiteSpaceRegexp = /\s/;

function tokenizeSpace(chars: string[]): Token | null {
  let length = 0;
  while (chars[0] && chars[0].match(whiteSpaceRegexp)) {
    length++;
    chars.shift();
  }

  if (length) {
    return { type: "SPACE", value: " ".repeat(length) };
  }
  return null;
}

function tokenizeInvalidRange(chars: string[]): Token | null {
  if (startsWith(chars, INCORRECT_RANGE_STRING)) {
    chars.splice(0, INCORRECT_RANGE_STRING.length);
    return { type: "INVALID_REFERENCE", value: INCORRECT_RANGE_STRING };
  }
  return null;
}
