import state, { GlobalState } from "./global_state";

export enum STATES {
  INITIAL,
  COMPOSER_OPEN_CURSOR_MOVE,
  COMPOSER_OPEN_SELECTION_MOVE,
  CONTEXT_MENU_OPEN,
  SIDE_PANEL_OPEN,
  LINK_EDITOR_OPEN,
  FIGURE_SELECTED,
}

class StateMachine {
  currentState: STATES = STATES.INITIAL;
  gs = state;

  stateMachine = {
    [STATES.INITIAL]: {
      [STATES.COMPOSER_OPEN_CURSOR_MOVE]: (s: GlobalState) => {
        s.focusContentComposer();
      },
      [STATES.COMPOSER_OPEN_SELECTION_MOVE]: (s: GlobalState) => s.focusCellComposer(),
    },
    [STATES.COMPOSER_OPEN_CURSOR_MOVE]: {},
    [STATES.COMPOSER_OPEN_SELECTION_MOVE]: {},
  };

  goTo(state: STATES): boolean {
    const transition = this.stateMachine[this.currentState][state];
    if (transition) {
      transition(this.gs);
      return true;
    }
    return false;
  }
}

const stateMachine = new StateMachine();

export default stateMachine;
