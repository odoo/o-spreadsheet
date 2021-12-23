import { Token } from ".";
import { mergeSymbolsIntoRanges } from "./range_tokenizer";
import { tokenize } from "./tokenizer";

/**
 * Enriched Token is used by the composer to add information on the tokens that
 * are only needed during the edition of a formula.
 *
 * The information added are:
 * - parenthesis matching
 * - range detection (replaces the tokens that composes the range with 1 token)
 * - length, start and end of each token
 */

export interface EnrichedToken extends Token {
  start: number;
  end: number;
  length: number;
  parenIndex?: number;
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
 * Take the result of the tokenizer and transform it to be usable in the composer.
 *
 * @param formula
 */
export function composerTokenize(formula: string): EnrichedToken[] {
  const tokens = tokenize(formula);

  return mapParenthesis(enrichTokens(mergeSymbolsIntoRanges(tokens)));
}
