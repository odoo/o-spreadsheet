import { isColumnReference } from "../helpers";
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
  let operator: number | void = undefined; // Index of operator ":" in range
  let refStart: number | void = undefined; // Index of start of range
  let refEnd: number | void = undefined; // Index of end of range
  let startIncludingSpaces: number | void = undefined; // Index of start of range, including spaces before range
  let isRefOfFullRow: boolean = false; // If we work on a range of a full row (eg. 1:1)
  let isRefOfFullCol: boolean = false; // If we work on a range of a full column (eg. A2:A)

  const reset = () => {
    startIncludingSpaces = undefined;
    refStart = undefined;
    operator = undefined;
    refEnd = undefined;
    isRefOfFullRow = false;
    isRefOfFullCol = false;
  };

  for (let i = 0; i < result.length; i++) {
    const token = result[i];

    // If we already have a token that could be the start of a range, or a SPACE token
    if (startIncludingSpaces) {
      // If we already have a token that could be the start of a range
      if (refStart) {
        // Skip spaces
        if (token.type === "SPACE") {
          continue;
        }
        // Find the ":" operator of a range
        else if (token.type === "OPERATOR" && token.value === ":") {
          operator = i;
        }
        // Find the second symbol of a range
        // Be careful not to build a range A:1 or A:1. A2:3 and A:A2 are both valid ranges.
        else if (
          operator &&
          ((token.type === "SYMBOL" && !(isRefOfFullRow && isColumnReference(token.value))) ||
            (token.type === "NUMBER" && !isRefOfFullCol))
        ) {
          refEnd = i;
        }
        // Cannot add the current token to the range we're currently building
        else {
          // We have all the token needed to build a new range
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
          }
          // Cannot build a range with the current tokens
          else {
            // Start building a new range beginning with the current token if possible, else reset
            if (["SYMBOL", "NUMBER"].includes(token.type)) {
              startIncludingSpaces = i;
              refStart = i;
              operator = undefined;
              isRefOfFullRow = token.type === "NUMBER";
              isRefOfFullCol = isColumnReference(token.value);
            } else {
              reset();
            }
          }
        }
      }
      // If we only have found a SPACE token
      else {
        // Start building a new range beginning with the current token if possible, else reset
        if (["SYMBOL", "NUMBER"].includes(token.type)) {
          refStart = i;
          operator = refEnd = undefined;
          isRefOfFullRow = token.type === "NUMBER";
          isRefOfFullCol = isColumnReference(token.value);
        } else {
          reset();
        }
      }
    }
    // We found nothing yet, try to find a token that could be the beginning of a range
    else {
      if (["SPACE", "SYMBOL", "NUMBER"].includes(token.type)) {
        startIncludingSpaces = i;
        refStart = ["SYMBOL", "NUMBER"].includes(token.type) ? i : undefined;
        operator = refEnd = undefined;
        isRefOfFullRow = token.type === "NUMBER";
        isRefOfFullCol = isColumnReference(token.value);
      } else {
        reset();
      }
    }
  }

  // Try to build a range with the last tokens we used
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
