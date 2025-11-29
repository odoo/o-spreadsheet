import {
  TokenizingChars,
  getFormulaNumberRegex,
  rangeReference,
  replaceNewLines,
  specialWhiteSpaceRegexp,
} from "../helpers";
import { CellErrorType } from "../types/errors";
import { DEFAULT_LOCALE, type Locale } from "../types/locale";

import { NEWLINE } from "../constants";

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

export const POSTFIX_UNARY_OPERATORS = ["%"];
const OPERATORS = "+,-,*,/,:,=,<>,>=,>,<=,<,^,&".split(",").concat(POSTFIX_UNARY_OPERATORS);

type TokenType =
  | "OPERATOR"
  | "NUMBER"
  | "STRING"
  | "SYMBOL"
  | "SPACE"
  | "DEBUGGER"
  | "ARG_SEPARATOR"
  | "ARRAY_ROW_SEPARATOR"
  | "LEFT_PAREN"
  | "RIGHT_PAREN"
  | "LEFT_BRACE"
  | "RIGHT_BRACE"
  | "REFERENCE"
  | "INVALID_REFERENCE"
  | "UNKNOWN";

export interface Token {
  readonly type: TokenType;
  readonly value: string;
}

export function tokenize(str: string, locale = DEFAULT_LOCALE): Token[] {
  str = replaceNewLines(str);
  const chars = new TokenizingChars(str);
  const result: Token[] = [];
  const tokenizeSpace = specialWhiteSpaceRegexp.test(str)
    ? tokenizeSpecialCharacterSpace
    : tokenizeSimpleSpace;

  while (!chars.isOver()) {
    let token =
      tokenizeNewLine(chars) ||
      tokenizeSpace(chars) ||
      tokenizeArrayRowSeparator(chars, locale) ||
      tokenizeArgsSeparator(chars, locale) ||
      tokenizeBraces(chars) ||
      tokenizeParenthesis(chars) ||
      tokenizeOperator(chars) ||
      tokenizeString(chars) ||
      tokenizeDebugger(chars) ||
      tokenizeInvalidRange(chars) ||
      tokenizeNumber(chars, locale) ||
      tokenizeSymbol(chars);

    if (!token) {
      token = { type: "UNKNOWN", value: chars.shift() };
    }

    result.push(token);
  }
  return result;
}

function tokenizeDebugger(chars: TokenizingChars): Token | null {
  if (chars.current === "?") {
    chars.shift();
    return { type: "DEBUGGER", value: "?" };
  }
  return null;
}

const parenthesis = {
  "(": { type: "LEFT_PAREN", value: "(" },
  ")": { type: "RIGHT_PAREN", value: ")" },
} as const;

function tokenizeParenthesis(chars: TokenizingChars): Token | null {
  if (chars.current === "(" || chars.current === ")") {
    const value = chars.shift();
    return parenthesis[value];
  }
  return null;
}

const braces = {
  "{": { type: "LEFT_BRACE", value: "{" },
  "}": { type: "RIGHT_BRACE", value: "}" },
} as const;

function tokenizeBraces(chars: TokenizingChars): Token | null {
  if (chars.current === "{" || chars.current === "}") {
    const value = chars.shift();
    return braces[value];
  }
  return null;
}

function tokenizeArgsSeparator(chars: TokenizingChars, locale: Locale): Token | null {
  if (chars.current === locale.formulaArgSeparator) {
    const value = chars.shift();
    const type = "ARG_SEPARATOR";
    return { type, value };
  }

  return null;
}

function tokenizeArrayRowSeparator(chars: TokenizingChars, locale: Locale): Token | null {
  // The array row separator is used in array literals to separate rows.
  // It is not explicitly defined in locales, but depends on the formulaArgSeparator.
  // Example: {1,2,3;4,5,6} — here, ';' separates rows and ',' separates columns.
  const rowSeparator = locale.formulaArgSeparator === ";" ? "\\" : ";";
  if (!rowSeparator) {
    return null;
  }
  if (chars.current === rowSeparator) {
    chars.shift();
    return { type: "ARRAY_ROW_SEPARATOR", value: rowSeparator };
  }
  return null;
}

function tokenizeOperator(chars: TokenizingChars): Token | null {
  for (const op of OPERATORS) {
    if (chars.currentStartsWith(op)) {
      chars.advanceBy(op.length);
      return { type: "OPERATOR", value: op };
    }
  }
  return null;
}

const FIRST_POSSIBLE_NUMBER_CHARS = new Set("0123456789");

function tokenizeNumber(chars: TokenizingChars, locale: Locale): Token | null {
  if (
    !FIRST_POSSIBLE_NUMBER_CHARS.has(chars.current) &&
    chars.current !== locale.decimalSeparator
  ) {
    return null;
  }
  const match = chars.remaining().match(getFormulaNumberRegex(locale.decimalSeparator));
  if (match) {
    chars.advanceBy(match[0].length);
    return { type: "NUMBER", value: match[0] };
  }
  return null;
}

function tokenizeString(chars: TokenizingChars): Token | null {
  if (chars.current === '"') {
    const startChar = chars.shift();
    let letters: string = startChar;
    while (chars.current && (chars.current !== startChar || letters[letters.length - 1] === "\\")) {
      letters += chars.shift();
    }
    if (chars.current === '"') {
      letters += chars.shift();
    }
    return {
      type: "STRING",
      value: letters,
    };
  }
  return null;
}

/**
  - \p{L} is for any letter (from any language)
  - \p{N} is for any number
  - the u flag at the end is for unicode, which enables the `\p{...}` syntax
 */
const unicodeSymbolCharRegexp = /\p{L}|\p{N}|_|\.|!|\$/u;
const SYMBOL_CHARS = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.!$");

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
  if (chars.current === "'") {
    let lastChar = chars.shift();
    result += lastChar;
    while (chars.current) {
      lastChar = chars.shift();
      result += lastChar;
      if (lastChar === "'") {
        if (chars.current && chars.current === "'") {
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
  while (
    chars.current &&
    (SYMBOL_CHARS.has(chars.current) || chars.current.match(unicodeSymbolCharRegexp))
  ) {
    result += chars.shift();
  }
  if (result.length) {
    const value = result;
    const isReference = rangeReference.test(value);
    if (isReference) {
      return { type: "REFERENCE", value };
    }
    return { type: "SYMBOL", value };
  }
  return null;
}

function tokenizeSpecialCharacterSpace(chars: TokenizingChars): Token | null {
  let spaces = "";
  while (chars.current === " " || (chars.current && chars.current.match(specialWhiteSpaceRegexp))) {
    spaces += chars.shift();
  }

  if (spaces) {
    return { type: "SPACE", value: spaces };
  }
  return null;
}

function tokenizeSimpleSpace(chars: TokenizingChars): Token | null {
  let spaces = "";
  while (chars.current === " ") {
    spaces += chars.shift();
  }

  if (spaces) {
    return { type: "SPACE", value: spaces };
  }
  return null;
}

function tokenizeNewLine(chars: TokenizingChars): Token | null {
  let length = 0;
  while (chars.current === NEWLINE) {
    length++;
    chars.shift();
  }
  if (length) {
    return { type: "SPACE", value: NEWLINE.repeat(length) };
  }
  return null;
}

function tokenizeInvalidRange(chars: TokenizingChars): Token | null {
  if (chars.currentStartsWith(CellErrorType.InvalidReference)) {
    chars.advanceBy(CellErrorType.InvalidReference.length);
    return { type: "INVALID_REFERENCE", value: CellErrorType.InvalidReference };
  }
  return null;
}
