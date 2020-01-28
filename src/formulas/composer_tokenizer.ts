import { Token, tokenize, TokenType } from "./tokenizer";

/**
 * Composer_tokenizer is used by the composer to add information on the tokens that are only
 * needed during the edition of a formula.
 *
 * The information added are:
 * - parenthesis matching
 * - range detection (replaces the tokens that composes the range with 1 token)
 * - length, start and end of each token
 */

export interface ComposerToken extends Token {
  start: number;
  end: number;
  length: number;
  parenIndex?: number;
}

/**
 * add on each token the length, start and end
 * also matches the opening to its closing parenthesis (using the same number)
 */
function mapLengthAndParents(tokens: Token[]): ComposerToken[] {
  let current = 0;
  let maxParen = 1;
  const stack: number[] = [];
  return tokens.map(x => {
    const len = x.value.toString().length;
    const token: ComposerToken = Object.assign({}, x, {
      start: current,
      end: current + len,
      length: len
    });
    current = token.end;
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
 * finds a sequence of token that represent a range and replace them with a single token
 * The range can be
 *  ?spaces symbol ?spaces operator: ?spaces symbol ?spaces
 */
function mergeSymbolsIntoRanges(result: ComposerToken[]): ComposerToken[] {
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
                .map(x => x.value)
                .join("")
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
        .map(x => x.value)
        .join("")
    };
    result.splice(startIncludingSpaces, i - startIncludingSpaces + 1, newToken);
  }
  return result;
}

/**
 * Take the result of the tokenizer and transform it to be usable in the composer.
 *
 * @param formula
 */
export function composerTokenize(formula: string): ComposerToken[] {
  const tokens = tokenize(formula);

  return mergeSymbolsIntoRanges(mapLengthAndParents(tokens));
}
