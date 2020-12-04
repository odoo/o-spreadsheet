import { Token, tokenize, TokenType } from "./tokenizer";

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

export interface FunctionContext {
  parent: string;
  argPosition: number;
}

/**
 * Add the following information on tokens:
 * - length
 * - start
 * - end
 */
export function enrichTokens(tokens: Token[]): EnrichedToken[] {
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
 * Remove information added on EnrichedToken to make a Token
 */
function toSimpleTokens(composerTokens: EnrichedToken[]): Token[] {
  return composerTokens.map((x) => {
    return {
      type: x.type,
      value: x.value,
    };
  });
}

/**
 * finds a sequence of token that represent a range and replace them with a single token
 * The range can be
 *  ?spaces symbol ?spaces operator: ?spaces symbol ?spaces
 */
export function mergeSymbolsIntoRanges(
  result: EnrichedToken[],
  removeSpace = false
): EnrichedToken[] {
  let operator: number | void = undefined;
  let refStart: number | void = undefined;
  let refEnd: number | void = undefined;
  let startIncludingSpaces: number | void = undefined;

  const reset = () => {
    startIncludingSpaces = undefined;
    refStart = undefined;
    operator = undefined;
    refEnd = undefined;
  };

  for (let i = 0; i < result.length; i++) {
    const token = result[i];

    if (startIncludingSpaces) {
      if (refStart) {
        if (token.type === "SPACE") {
          continue;
        } else if (token.type === "OPERATOR" && token.value === ":") {
          operator = i;
        } else if (operator && token.type === "SYMBOL") {
          refEnd = i;
        } else {
          if (startIncludingSpaces && refStart && operator && refEnd) {
            const newToken = {
              type: <TokenType>"SYMBOL",
              start: result[startIncludingSpaces].start,
              end: result[i - 1].end,
              length: result[i - 1].end - result[startIncludingSpaces].start,
              value: result
                .slice(startIncludingSpaces, i)
                .filter((x) => !removeSpace || x.type !== "SPACE")
                .map((x) => x.value)
                .join(""),
            };
            result.splice(startIncludingSpaces, i - startIncludingSpaces, newToken);
            i = startIncludingSpaces + 1;
            reset();
          } else {
            if (token.type === "SYMBOL") {
              startIncludingSpaces = i;
              refStart = i;
              operator = undefined;
            } else {
              reset();
            }
          }
        }
      } else {
        if (token.type === "SYMBOL") {
          refStart = i;
          operator = refEnd = undefined;
        } else {
          reset();
        }
      }
    } else {
      if (["SPACE", "SYMBOL"].includes(token.type)) {
        startIncludingSpaces = i;
        refStart = token.type === "SYMBOL" ? i : undefined;
        operator = refEnd = undefined;
      } else {
        reset();
      }
    }
  }
  const i = result.length - 1;
  if (startIncludingSpaces && refStart && operator && refEnd) {
    const newToken = {
      type: <TokenType>"SYMBOL",
      start: result[startIncludingSpaces].start,
      end: result[i].end,
      length: result[i].end - result[startIncludingSpaces].start,
      value: result
        .slice(startIncludingSpaces, i + 1)
        .filter((x) => !removeSpace || x.type !== "SPACE")
        .map((x) => x.value)
        .join(""),
    };
    result.splice(startIncludingSpaces, i - startIncludingSpaces + 1, newToken);
  }
  return result;
}

/**
 * Take the result of the tokenizer and transform it to be usable in the
 * manipulations of range
 *
 * @param formula
 */
export function rangeTokenize(formula: string): Token[] {
  const tokens = tokenize(formula);
  return toSimpleTokens(mergeSymbolsIntoRanges(enrichTokens(tokens), true));
}
