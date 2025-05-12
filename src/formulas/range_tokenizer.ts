import {
  isColHeader,
  isColReference,
  isRowHeader,
  isRowReference,
  isSingleCellReference,
} from "../helpers";
import { DEFAULT_LOCALE } from "./../types/locale";
import { Token, tokenize } from "./tokenizer";

enum State {
  /**
   * Initial state.
   * Expecting any reference for the left part of a range
   * e.g. "A1", "1", "A", "Sheet1!A1", "Sheet1!A"
   */
  LeftRef,
  /**
   * Expecting any reference for the right part of a range
   * e.g. "A1", "1", "A", "Sheet1!A1", "Sheet1!A"
   */
  RightRef,
  /**
   * Expecting the separator without any constraint on the right part
   */
  Separator,
  /**
   * Expecting the separator for a full column range
   */
  FullColumnSeparator,
  /**
   * Expecting the separator for a full row range
   */
  FullRowSeparator,
  /**
   * Expecting the right part of a full column range
   * e.g. "1", "A1"
   */
  RightColumnRef,
  /**
   * Expecting the right part of a full row range
   * e.g. "A", "A1"
   */
  RightRowRef,
  /**
   * Final state. A range has been matched
   */
  Found,
}

type Transition = (token: Token) => State | undefined;

type Machine = {
  [s in State]: Record<string, Transition | undefined>;
};

const machine: Machine = {
  [State.LeftRef]: {
    REFERENCE: () => State.Separator,
    NUMBER: () => State.FullRowSeparator,
    SYMBOL: (token) => {
      if (isColReference(token.value)) {
        return State.FullColumnSeparator;
      }
      if (isRowReference(token.value)) {
        return State.FullRowSeparator;
      }
      return undefined;
    },
  },
  [State.FullColumnSeparator]: {
    SPACE: () => State.FullColumnSeparator,
    OPERATOR: (token) => (token.value === ":" ? State.RightColumnRef : undefined),
  },
  [State.FullRowSeparator]: {
    SPACE: () => State.FullRowSeparator,
    OPERATOR: (token) => (token.value === ":" ? State.RightRowRef : undefined),
  },
  [State.Separator]: {
    SPACE: () => State.Separator,
    OPERATOR: (token) => (token.value === ":" ? State.RightRef : undefined),
  },
  [State.RightRef]: {
    SPACE: () => State.RightRef,
    NUMBER: () => State.Found,
    REFERENCE: (token) => (isSingleCellReference(token.value) ? State.Found : undefined),
    SYMBOL: (token) =>
      isColHeader(token.value) || isRowHeader(token.value) ? State.Found : undefined,
  },
  [State.RightColumnRef]: {
    SPACE: () => State.RightColumnRef,
    SYMBOL: (token) => (isColHeader(token.value) ? State.Found : undefined),
    REFERENCE: (token) => (isSingleCellReference(token.value) ? State.Found : undefined),
  },
  [State.RightRowRef]: {
    SPACE: () => State.RightRowRef,
    NUMBER: () => State.Found,
    REFERENCE: (token) => (isSingleCellReference(token.value) ? State.Found : undefined),
    SYMBOL: (token) => (isRowHeader(token.value) ? State.Found : undefined),
  },
  [State.Found]: {},
};

/**
 * Check if the list of tokens starts with a sequence of tokens representing
 * a range.
 * If a range is found, the sequence is removed from the list and is returned
 * as a single token.
 */
function matchReference(tokens: Token[]): Token | null {
  let head = 0;
  let transitions = machine[State.LeftRef];
  let matchedTokens: string = "";
  while (transitions !== undefined) {
    const token = tokens[head++];
    if (!token) {
      return null;
    }
    const nextState = transitions[token.type]?.(token);
    switch (nextState) {
      case undefined:
        return null;
      case State.Found:
        matchedTokens += token.value;
        tokens.splice(0, head);
        return {
          type: "REFERENCE",
          value: matchedTokens,
        };
      default:
        transitions = machine[nextState];
        matchedTokens += token.value;
        break;
    }
  }
  return null;
}

/**
 * Take the result of the tokenizer and transform it to be usable in the
 * manipulations of range
 *
 * @param formula
 */
export function rangeTokenize(formula: string, locale = DEFAULT_LOCALE): Token[] {
  const tokens = tokenize(formula, locale);
  const result: Token[] = [];
  while (tokens.length) {
    result.push(matchReference(tokens) || tokens.shift()!);
  }
  return result;
}
