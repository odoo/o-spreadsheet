import { tokenize } from "./tokenizer";
import { Arg } from "../types/index";
import {
  mergeSymbolsIntoRanges,
  EnrichedToken,
  enrichTokens,
  FunctionContext,
} from "./range_tokenizer";

/**
 * Take the result of the tokenizer and transform it to be usable in the composer.
 *
 * @param formula
 */
export function composerTokenize(formula: string): EnrichedToken[] {
  const tokens = tokenize(formula);

  return mapParentFunction(mergeSymbolsIntoRanges(mapParenthesis(enrichTokens(tokens))));
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
      case "FUNCTION":
        functionStarted = token.value;
        break;
      case "LEFT_PAREN":
        stack.push({ parent: functionStarted, argPosition: 0 });
        functionStarted = "";
        break;
      case "RIGHT_PAREN":
        stack.pop();
        break;
      case "COMMA":
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
 * Function returning the index of the function argument need to be focus in the formula assistant.
 * This is particularly useful for functions with repeatable arguments.
 *
 * Indeed the function makes it possible to center the index on repeatable arguments when the
 * number of arguments supplied is greater than the number of arguments defined by the function.
 *
 * Ex:
 *
 * in the formula "=ADD(11, 55, 66)" which is defined like this "ADD(value1, value2)"
 * - 11 corresponds to the value1 argument => index will be 1
 * - 55 corresponds to the value2 argument => index will be 2
 * - 66 does not correspond any argument => index will be -1
 *
 * in the formula "=AVERAGE.WEIGHTED(1, 2, 3, 4, 5, 6)" which is defined like this
 * "AVERAGE.WEIGHTED(values, weights, [additional_values, ...], [additional_weights, ...])"
 * - 1 corresponds to the values argument => index will be 1
 * - 2 corresponds to the weights argument => index will be 2
 * - 3 corresponds to the [additional_values, ...] argument => index will be 3
 * - 4 corresponds to the [additional_weights, ...] argument => index will be 4
 * - 5 corresponds to the [additional_values, ...] argument => index will be 3
 * - 6 corresponds to the [additional_weights, ...] argument => index will be 4
 */
export function argumentToFocus(args: Arg[], argPosition: number): number {
  const nbrArgs = args.length;
  if (argPosition + 1 > nbrArgs) {
    const nbrRepeatable = args.filter((a) => a.repeating).length;
    if (nbrRepeatable) {
      if (nbrRepeatable === 1) {
        return nbrArgs - 1;
      }
      const repeatableArg = (argPosition + 1 - nbrArgs) % nbrRepeatable;
      return nbrArgs - nbrRepeatable + repeatableArg - 1;
    }
    return -1;
  }
  return argPosition;
}
