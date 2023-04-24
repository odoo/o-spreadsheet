import { INCORRECT_RANGE_STRING, NEWLINE } from "../constants";
import { functionRegistry } from "../functions/index";
import { formulaNumberRegexp, rangeReference, replaceSpecialSpaces } from "../helpers/index";

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
  str = replaceSpecialSpaces(str);
  const chars = new TokenizingChars(str);
  const result: Token[] = [];

  while (!chars.isOver()) {
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
      token = { type: "UNKNOWN", value: chars.shift() };
    }

    result.push(token);
  }
  return result;
}

function tokenizeDebugger(chars: TokenizingChars): Token | null {
  if (chars.current() === "?") {
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

function tokenizeMisc(chars: TokenizingChars): Token | null {
  if (chars.current() in misc) {
    const value = chars.shift();
    const type = misc[value];
    return { type, value };
  }
  return null;
}

function tokenizeOperator(chars: TokenizingChars): Token | null {
  for (let op of OPERATORS) {
    if (chars.currentStartsWith(op)) {
      chars.advanceBy(op.length);
      return { type: "OPERATOR", value: op };
    }
  }
  return null;
}

function tokenizeNumber(chars: TokenizingChars): Token | null {
  const match = chars.remaining().match(formulaNumberRegexp);
  if (match) {
    chars.advanceBy(match[0].length);
    return { type: "NUMBER", value: match[0] };
  }
  return null;
}

function tokenizeString(chars: TokenizingChars): Token | null {
  if (chars.current() === '"') {
    const startChar = chars.shift();
    let letters: string = startChar;
    while (
      chars.current() &&
      (chars.current() !== startChar || letters[letters.length - 1] === "\\")
    ) {
      letters += chars.shift();
    }
    if (chars.current() === '"') {
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
function tokenizeSymbol(chars: TokenizingChars): Token | null {
  let result: string = "";
  // there are two main cases to manage: either something which starts with
  // a ', like 'Sheet 2'A2, or a word-like element.
  if (chars.current() === "'") {
    let lastChar = chars.shift();
    result += lastChar;
    while (chars.current()) {
      lastChar = chars.shift();
      result += lastChar;
      if (lastChar === "'") {
        if (chars.current() && chars.current() === "'") {
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
  while (chars.current() && separatorRegexp.test(chars.current())) {
    result += chars.shift();
  }
  if (result.length) {
    const value = result;
    const isFunction = value.toUpperCase() in functions;
    if (isFunction) {
      return { type: "FUNCTION", value };
    }
    const isReference = rangeReference.test(value);
    if (isReference) {
      return { type: "REFERENCE", value };
    } else {
      return { type: "SYMBOL", value };
    }
  }
  return null;
}

function tokenizeSpace(chars: TokenizingChars): Token | null {
  let length = 0;
  while (chars.current() === NEWLINE) {
    length++;
    chars.shift();
  }
  if (length) {
    return { type: "SPACE", value: NEWLINE.repeat(length) };
  }

  while (chars.current() === " ") {
    length++;
    chars.shift();
  }

  if (length) {
    return { type: "SPACE", value: " ".repeat(length) };
  }
  return null;
}

function tokenizeInvalidRange(chars: TokenizingChars): Token | null {
  if (chars.currentStartsWith(INCORRECT_RANGE_STRING)) {
    chars.advanceBy(INCORRECT_RANGE_STRING.length);
    return { type: "INVALID_REFERENCE", value: INCORRECT_RANGE_STRING };
  }
  return null;
}

class TokenizingChars {
  private text: string;
  private currentIndex: number = 0;

  constructor(text: string) {
    this.text = text;
  }

  current() {
    return this.text[this.currentIndex];
  }

  shift() {
    return this.text[this.currentIndex++];
  }

  advanceBy(length: number) {
    this.currentIndex += length;
  }

  isOver() {
    return this.currentIndex >= this.text.length;
  }

  remaining() {
    return this.text.substring(this.currentIndex);
  }

  currentStartsWith(str: string) {
    for (let j = 0; j < str.length; j++) {
      if (this.text[this.currentIndex + j] !== str[j]) {
        return false;
      }
    }
    return true;
  }
}
