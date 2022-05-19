import { concat, isColReference, isRowReference } from "../helpers";
import { Token, tokenize } from "./tokenizer";

/**
 * finds a sequence of token that represent a range and replace them with a single token
 * The range can be
 *  ?spaces symbol ?spaces operator: ?spaces symbol ?spaces
 */
export function mergeSymbolsIntoRanges(result: Token[], removeSpace = false): Token[] {
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
          (token.type === "REFERENCE" ||
            (token.type === "SYMBOL" && !isRefOfFullRow && isColReference(token.value)) ||
            (token.type === "NUMBER" && !isRefOfFullCol))
        ) {
          refEnd = i;
        }
        // Cannot add the current token to the range we're currently building
        else {
          // We have all the token needed to build a new range
          if (startIncludingSpaces && refStart && operator && refEnd) {
            const newToken: Token = {
              type: "REFERENCE",
              value: concat(
                result
                  .slice(startIncludingSpaces, i)
                  .filter((x) => !removeSpace || x.type !== "SPACE")
                  .map((x) => x.value)
              ),
            };
            result.splice(startIncludingSpaces, i - startIncludingSpaces, newToken);
            i = startIncludingSpaces + 1;
            reset();
          }
          // Cannot build a range with the current tokens
          else {
            // Start building a new range beginning with the current token if possible, else reset
            if (["REFERENCE", "NUMBER", "SYMBOL"].includes(token.type)) {
              startIncludingSpaces = i;
              operator = undefined;
              isRefOfFullRow = isRowReference(token.value);
              isRefOfFullCol = isColReference(token.value);
              if (token.type === "REFERENCE" || isRefOfFullRow || isRefOfFullCol) {
                refStart = i;
              } else reset();
            } else {
              reset();
            }
          }
        }
      }
      // If we only have found a SPACE token
      else {
        // Start building a new range beginning with the current token if possible, else reset
        if (["REFERENCE", "NUMBER", "SYMBOL"].includes(token.type)) {
          operator = refEnd = undefined;
          isRefOfFullRow = isRowReference(token.value);
          isRefOfFullCol = isColReference(token.value);
          if (token.type === "REFERENCE" || isRefOfFullRow || isRefOfFullCol) {
            refStart = i;
          } else reset();
        } else {
          reset();
        }
      }
    }
    // We found nothing yet, try to find a token that could be the beginning of a range
    else {
      if (["SPACE", "REFERENCE", "NUMBER", "SYMBOL"].includes(token.type)) {
        operator = refEnd = undefined;
        startIncludingSpaces = i;
        isRefOfFullRow = isRowReference(token.value);
        isRefOfFullCol = isColReference(token.value);
        if (token.type === "REFERENCE" || isRefOfFullRow || isRefOfFullCol) {
          refStart = i;
        }
      } else {
        reset();
      }
    }
  }

  // Try to build a range with the last tokens we used
  const i = result.length - 1;
  if (startIncludingSpaces && refStart && operator && refEnd) {
    const newToken: Token = {
      type: "REFERENCE",
      value: concat(
        result
          .slice(startIncludingSpaces, i + 1)
          .filter((x) => !removeSpace || x.type !== "SPACE")
          .map((x) => x.value)
      ),
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
  return mergeSymbolsIntoRanges(tokens, true);
}
