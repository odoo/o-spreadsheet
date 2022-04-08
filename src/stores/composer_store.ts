import { StoreConfig } from "./providers";

interface State {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

interface Composer {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

class ComposerActions {
  constructor() {}
}

export const ComposerProvider: (depth?: number) => StoreConfig<State, Composer, ComposerActions> =
  () => ({
    actions: ComposerActions,
    state: {
      content: "",
      selectionStart: 0,
      selectionEnd: 0,
    },
    computeView: (state) => {
      return state;
    },
  });
