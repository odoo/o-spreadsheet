import { Model } from "..";
import { ModelProvider } from "./model_store";
import { StoreConfig, StoresWatch } from "./providers";

// interface State {
//   content: string;
//   selectionStart: number;
//   selectionEnd: number;
// }

// interface Composer {
//   content: string;
//   selectionStart: number;
//   selectionEnd: number;
// }

class ComposerActions {
  constructor() {}
}

function composerContentProvider(
  stores: StoresWatch,
  model: Model
): StoreConfig<{ content: string }, { content: string }, any> {
  const getters = stores.withParam(model).watch(ModelProvider);
  console.log("composerContentProvider created");
  return {
    state: { content: getters.getCurrentContent() },
    actions: class {},
    computeView: (state) => state,
  };
}

export function formulaAssistantProvider(stores: StoresWatch, model: Model) {
  const composer = stores.withParam(model).watch(composerContentProvider);
  return {
    actions: ComposerActions,
    state: {
      content: composer.content,
      selectionStart: 0,
      selectionEnd: 0,
    },
    computeView: (state) => {
      console.log("awesome formula assistant is reset!");
      return state;
    },
  };
}
