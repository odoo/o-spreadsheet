import { INCORRECT_RANGE_STRING } from "../constants";
import { functionRegistry } from "../functions/index";
import { concat, formulaNumberRegexp, rangeReference } from "../helpers/index";

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

const functions = functionRegistry.content;
export const POSTFIX_UNARY_OPERATORS = ["%"];
const OPERATORS = "+,-,*,/,:,=,<>,>=,>,<=,<,^,&".split(",").concat(POSTFIX_UNARY_OPERATORS);

type TokenType =
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
  const match = concat(chars).match(formulaNumberRegexp);
  if (match) {
    chars.splice(0, match[0].length);
    return { type: "NUMBER", value: match[0] };
  }
  return null;
}

function tokenizeString(chars: string[]): Token | null {
  if (chars[0] === '"') {
    const startChar = chars.shift()!;
    let letters: string = startChar;
    while (chars[0] && (chars[0] !== startChar || letters[letters.length - 1] === "\\")) {
      letters += chars.shift();
    }
    if (chars[0] === '"') {
      letters += chars.shift();
    }
    return {
      type: "STRING",
      value: letters,
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
  let result: string = "";
  // there are two main cases to manage: either something which starts with
  // a ', like 'Sheet 2'A2, or a word-like element.
  if (chars[0] === "'") {
    let lastChar = chars.shift();
    result += lastChar;
    while (chars[0]) {
      lastChar = chars.shift();
      result += lastChar;
      if (lastChar === "'") {
        if (chars[0] && chars[0] === "'") {
          lastChar = chars.shift();
          result += lastChar;
        } else {
          break;
        }
      }
    }

    if (lastChar !== "'") {
      return {
        type: "UNKNOWN",
        value: result,
      };
    }
  }
  while (chars[0] && chars[0].match(separatorRegexp)) {
    result += chars.shift();
  }
  if (result.length) {
    const value = result;
    const isFunction = value.toUpperCase() in functions;
    if (isFunction) {
      return { type: "FUNCTION", value };
    }
    const isReference = value.match(rangeReference);
    if (isReference) {
      return { type: "REFERENCE", value };
    } else {
      return { type: "SYMBOL", value };
    }
  }
  return null;
}

const whiteSpaceRegexp = /\s/;

function tokenizeSpace(chars: string[]): Token | null {
  let spaces = "";
  while (chars[0] && chars[0].match(whiteSpaceRegexp)) {
    spaces += chars.shift();
  }

  if (spaces) {
    return { type: "SPACE", value: spaces };
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
