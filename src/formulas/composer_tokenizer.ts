import { EnrichedToken, enrichTokens, mergeSymbolsIntoRanges } from "./range_tokenizer";
import { tokenize } from "./tokenizer";

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

  return mergeSymbolsIntoRanges(mapParenthesis(enrichTokens(tokens)));
}
