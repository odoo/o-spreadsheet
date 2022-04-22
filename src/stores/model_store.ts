import { Model } from "../model";
import { Getters } from "../types";
import { StoreConfig } from "./providers";

interface State {
  model: Model;
  updateId: number;
}
class ModelUpdates {
  constructor(state: State) {
    state.model.on("update", this, () => {
      // trick the reactivity system
      state.updateId++;
    });
  }
}

type ModelStore = StoreConfig<State, Getters, ModelUpdates>;

export const ModelProvider = (model: Model): ModelStore => ({
  state: {
    model,
    updateId: 0,
  },
  actions: ModelUpdates,
  computeView: (state) => {
    return state.model.getters;
  },
});
