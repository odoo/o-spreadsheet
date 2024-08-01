import type { Locale } from "../types";
import type { Token } from "./index";
import { rangeTokenize } from "./range_tokenizer";
interface FunctionContext {
  parent: string;
  argPosition: number;
}

/**
 * Enriched Token is used by the composer to add information on the tokens that
 * are only needed during the edition of a formula.
 *
 * The information added are:
 * - start, end and length of each token
 * - range detection (replaces the tokens that composes the range with 1 token)
 * - parenthesis matching (only for parenthesis tokens)
 * - parent function (only for tokens surrounded by a function)
 * - arg position (only for tokens surrounded by a function)
 */

export interface EnrichedToken extends Token {
  start: number;
  end: number;
  length: number;
  parenIndex?: number;
  functionContext?: FunctionContext;
}

/**
 * Add the following information on tokens:
 * - length
 * - start
 * - end
 */
function enrichTokens(tokens: Token[]): EnrichedToken[] {
  let current = 0;
  return tokens.map((x) => {
    const len = x.value.toString().length;
    const token: EnrichedToken = Object.assign({}, x, {
      start: current,
      end: current + len,
      length: len,
    });
    current = token.end;
    return token;
  });
}

/**
 * add on each token the length, start and end
 * also matches the opening to its closing parenthesis (using the same number)
 */
function mapParenthesis(tokens: EnrichedToken[]): EnrichedToken[] {
  let maxParen = 1;
  const stack: number[] = [];
  return tokens.map((token) => {
    if (token.type === "LEFT_PAREN") {
      stack.push(maxParen);
      token.parenIndex = maxParen;
      maxParen++;
    } else if (token.type === "RIGHT_PAREN") {
      token.parenIndex = stack.pop();
    }
    return token;
  });
}

/**
 * add on each token its parent function and the index corresponding to
 * its position as an argument of the function.
 * In this example "=MIN(42,SUM(MAX(1,2),3))":
 * - the parent function of the token correspond to number 42 is the MIN function
 * - the argument position of the token correspond to number 42 is 0
 * - the parent function of the token correspond to number 3 is the SUM function
 * - the argument position of the token correspond to number 3 is 1
 */
function mapParentFunction(tokens: EnrichedToken[]): EnrichedToken[] {
  let stack: FunctionContext[] = [];
  let functionStarted = "";
  const res = tokens.map((token, i) => {
    if (!["SPACE", "LEFT_PAREN"].includes(token.type)) {
      functionStarted = "";
    }

    switch (token.type) {
      case "SYMBOL":
        functionStarted = token.value;
        break;
      case "LEFT_PAREN":
        stack.push({ parent: functionStarted, argPosition: 0 });
        functionStarted = "";
        break;
      case "RIGHT_PAREN":
        stack.pop();
        break;
      case "ARG_SEPARATOR":
        if (stack.length) {
          // increment position on current function
          stack[stack.length - 1].argPosition++;
        }
        break;
    }

    if (stack.length) {
      const functionContext = stack[stack.length - 1];
      if (functionContext.parent) {
        token.functionContext = Object.assign({}, functionContext);
      }
    }
    return token;
  });
  return res;
}

/**
 * Take the result of the tokenizer and transform it to be usable in the composer.
 *
 * @param formula
 */
export function composerTokenize(formula: string, locale: Locale): EnrichedToken[] {
  const tokens = rangeTokenize(formula, locale);

  return mapParentFunction(mapParenthesis(enrichTokens(tokens)));
}
