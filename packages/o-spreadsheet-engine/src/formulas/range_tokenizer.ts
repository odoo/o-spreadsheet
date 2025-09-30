import {
  isColHeader,
  isColReference,
  isRowHeader,
  isRowReference,
  isSingleCellReference,
} from "../helpers";
import { DEFAULT_LOCALE } from "../types/locale";
import { Token, tokenize } from "./tokenizer";

enum State {
  LeftRef,
  RightRef,
  Separator,
  FullColumnSeparator,
  FullRowSeparator,
  RightColumnRef,
  RightRowRef,
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

function matchReference(tokens: Token[]): Token | null {
  let head = 0;
  let transitions = machine[State.LeftRef];
  let matchedTokens = "";
  while (transitions !== undefined) {
    const token = tokens[head++];
    if (!token) {
      return null;
    }
    const transition = transitions[token.type]?.find((candidate) => candidate.guard(token));
    const nextState = transition ? transition.goTo : undefined;
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

export function rangeTokenize(formula: string, locale = DEFAULT_LOCALE): Token[] {
  const tokens = tokenize(formula, locale);
  const result: Token[] = [];
  while (tokens.length) {
    result.push(matchReference(tokens) || tokens.shift()!);
  }
  return result;
}
