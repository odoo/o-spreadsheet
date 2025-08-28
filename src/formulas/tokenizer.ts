import { NEWLINE } from "../constants";
import {
  TokenizingChars,
  getFormulaNumberRegex,
  rangeReference,
  replaceNewLines,
  whiteSpaceCharacters,
} from "../helpers/index";
import { DEFAULT_LOCALE, Locale } from "../types";
import { CellErrorType } from "../types/errors";

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
/**
  - \p{L} is for any letter (from any language)
  - \p{N} is for any number
  - the u flag at the end is for unicode, which enables the `\p{...}` syntax
 */
const unicodeSymbolCharRegexp = /\p{L}|\p{N}|_|\.|!|\$/u;
const UNICODE_SYMBOLS = new Set(
  Array.from({ length: 0xffff }, (_, i) => String.fromCharCode(i)).filter((char) =>
    unicodeSymbolCharRegexp.test(char)
  )
);

const SYMBOL_CHARS = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.!$");

const dispatchTable: { [key: string]: (chars: TokenizingChars) => Token } = {
  "?": tokenizeDebugger,
  "(": tokenizeParenthesis,
  ")": tokenizeParenthesis,
  '"': tokenizeString,
  "'": tokenizeSymbol,
  "#": tokenizeInvalidRange,
  [NEWLINE]: tokenizeNewLine,
  ...Object.fromEntries(whiteSpaceCharacters.map((char) => [char, tokenizeSpace])),
  ...Object.fromEntries(OPERATORS.map((op) => [op[0], tokenizeOperator])),
  // Add other specific characters here
};

type TokenType =
  | "OPERATOR"
  | "NUMBER"
  | "STRING"
  | "SYMBOL"
  | "SPACE"
  | "DEBUGGER"
  | "ARG_SEPARATOR"
  | "LEFT_PAREN"
  | "RIGHT_PAREN"
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

  while (!chars.isOver()) {
    const currentChar = chars.current;
    // Check if a specific tokenizer exists for this character
    if (dispatchTable[currentChar]) {
      result.push(dispatchTable[currentChar](chars));
      continue;
    }

    if (currentChar === locale.formulaArgSeparator) {
      result.push(tokenizeArgsSeparator(chars));
      continue;
    }

    if (FIRST_POSSIBLE_NUMBER_CHARS.has(currentChar) || currentChar === locale.decimalSeparator) {
      result.push(tokenizeNumber(chars, locale));
      continue;
    }

    if (SYMBOL_CHARS.has(currentChar) || UNICODE_SYMBOLS.has(currentChar)) {
      result.push(tokenizeSymbol(chars));
      continue;
    }

    result.push({ type: "UNKNOWN", value: chars.shift() });
  }
  return result;
}

function tokenizeDebugger(chars: TokenizingChars): Token {
  chars.shift();
  return { type: "DEBUGGER", value: "?" };
}

const parenthesis = {
  "(": { type: "LEFT_PAREN", value: "(" },
  ")": { type: "RIGHT_PAREN", value: ")" },
} as const;

function tokenizeParenthesis(chars: TokenizingChars): Token {
  const value = chars.shift();
  return parenthesis[value];
}

function tokenizeArgsSeparator(chars: TokenizingChars): Token {
  const value = chars.shift();
  return { type: "ARG_SEPARATOR", value };
}

function tokenizeOperator(chars: TokenizingChars): Token {
  let op = chars.shift();
  if (op === "<") {
    if (chars.current === "=" || chars.current === ">") {
      op += chars.shift();
    }
  } else if (op === ">" && chars.current === "=") {
    op += chars.shift();
  }
  return { type: "OPERATOR", value: op };
}

const FIRST_POSSIBLE_NUMBER_CHARS = new Set("0123456789");

function tokenizeNumber(chars: TokenizingChars, locale: Locale): Token {
  const match = chars.remaining().match(getFormulaNumberRegex(locale.decimalSeparator));
  if (match) {
    chars.advanceBy(match[0].length);
    return { type: "NUMBER", value: match[0] };
  }
  return tokenizeSymbol(chars);
}

function tokenizeString(chars: TokenizingChars): Token {
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
function tokenizeSymbol(chars: TokenizingChars): Token {
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
  while (chars.current && (SYMBOL_CHARS.has(chars.current) || UNICODE_SYMBOLS.has(chars.current))) {
    result += chars.shift();
  }

  const value = result;
  const isReference = rangeReference.test(value);
  if (isReference) {
    return { type: "REFERENCE", value };
  }
  return { type: "SYMBOL", value };
}

const whiteSpaceSet = new Set(whiteSpaceCharacters);
function tokenizeSpace(chars: TokenizingChars): Token {
  let spaces = "";
  while (whiteSpaceSet.has(chars.current)) {
    spaces += chars.shift();
  }
  return { type: "SPACE", value: spaces };
}

function tokenizeNewLine(chars: TokenizingChars): Token {
  let length = 0;
  while (chars.current === NEWLINE) {
    length++;
    chars.shift();
  }
  return { type: "SPACE", value: NEWLINE.repeat(length) };
}

function tokenizeInvalidRange(chars: TokenizingChars): Token {
  if (chars.currentStartsWith(CellErrorType.InvalidReference)) {
    chars.advanceBy(CellErrorType.InvalidReference.length);
    return { type: "INVALID_REFERENCE", value: CellErrorType.InvalidReference };
  }
  return tokenizeSymbol(chars);
}
