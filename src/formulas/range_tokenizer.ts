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

const goTo = (state: State, guard: (token: Token) => boolean = () => true) => [
  {
    goTo: state,
    guard,
  },
];

const goToMulti = (state: State, guard: (token: Token) => boolean = () => true) => ({
  goTo: state,
  guard,
});

interface Transition {
  goTo: State;
  guard: (token: Token) => boolean;
}

type Machine = {
  [s in State]: Record<string, Transition[] | undefined>;
};

const machine: Machine = {
  [State.LeftRef]: {
    REFERENCE: goTo(State.Separator),
    NUMBER: goTo(State.FullRowSeparator),
    SYMBOL: [
      goToMulti(State.FullColumnSeparator, (token) => isColReference(token.value)),
      goToMulti(State.FullRowSeparator, (token) => isRowReference(token.value)),
    ],
  },
  [State.FullColumnSeparator]: {
    SPACE: goTo(State.FullColumnSeparator),
    OPERATOR: goTo(State.RightColumnRef, (token) => token.value === ":"),
  },
  [State.FullRowSeparator]: {
    SPACE: goTo(State.FullRowSeparator),
    OPERATOR: goTo(State.RightRowRef, (token) => token.value === ":"),
  },
  [State.Separator]: {
    SPACE: goTo(State.Separator),
    OPERATOR: goTo(State.RightRef, (token) => token.value === ":"),
  },
  [State.RightRef]: {
    SPACE: goTo(State.RightRef),
    NUMBER: goTo(State.Found),
    REFERENCE: goTo(State.Found, (token) => isSingleCellReference(token.value)),
    SYMBOL: goTo(State.Found, (token) => isColHeader(token.value) || isRowHeader(token.value)),
  },
  [State.RightColumnRef]: {
    SPACE: goTo(State.RightColumnRef),
    SYMBOL: goTo(State.Found, (token) => isColHeader(token.value)),
    REFERENCE: goTo(State.Found, (token) => isSingleCellReference(token.value)),
  },
  [State.RightRowRef]: {
    SPACE: goTo(State.RightRowRef),
    NUMBER: goTo(State.Found),
    REFERENCE: goTo(State.Found, (token) => isSingleCellReference(token.value)),
    SYMBOL: goTo(State.Found, (token) => isRowHeader(token.value)),
  },
  [State.Found]: {},
};

/**
 * Check if the list of tokens starting at the given position represents
 * a range.
 * If a range is found, the sequence is returned as a single token along
 * with the number of tokens consumed.
 */
function matchReference(
  tokens: Token[],
  startIndex: number
): { token: Token | null; consumed: number } {
  let head = startIndex;
  let transitions = machine[State.LeftRef];
  let matchedTokens: string = "";
  let consumed = 0;

  while (transitions !== undefined) {
    const token = tokens[head++];
    consumed++;
    if (!token) {
      return { token: null, consumed: 0 };
    }
    const transition = transitions[token.type]?.find((transition) => transition.guard(token));
    const nextState = transition ? transition.goTo : undefined;
    switch (nextState) {
      case undefined:
        return { token: null, consumed: 0 };
      case State.Found:
        matchedTokens += token.value;
        return {
          token: {
            type: "REFERENCE",
            value: matchedTokens,
          },
          consumed,
        };
      default:
        transitions = machine[nextState];
        matchedTokens += token.value;
        break;
    }
  }
  return { token: null, consumed: 0 };
}

/**
 * Take the result of the tokenizer and transform it to be usable in the
 * manipulations of range
 *
 * @param formula
 */
export function rangeTokenize(formula: string, locale = DEFAULT_LOCALE): Token[] {
  const tokens = tokenize(formula, locale);
  const result: Token[] = new Array(tokens.length);
  let index = 0;
  let resultIndex = 0;

  while (index < tokens.length) {
    const { token, consumed } = matchReference(tokens, index);
    if (token) {
      result[resultIndex++] = token;
      index += consumed;
    } else {
      result[resultIndex++] = tokens[index++];
    }
  }

  return result.slice(0, resultIndex);
}
