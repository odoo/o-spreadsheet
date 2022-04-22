import { Model } from "../model";
import { Getters } from "../types";
import { StoreConfig, StoresWatch } from "./providers";

interface State {
  model: Model;
  subscribe: number;
}
class ModelUpdates {
  constructor(private state: State) {
    state.model.on("update", this, () => {
      // trick the reactivity system
      console.log("model update");
      this.state.subscribe++;
    });
  }
}

type ModelStore = StoreConfig<State, Getters & { subscribe: unknown }, ModelUpdates>;

export const ModelProvider = (stores: StoresWatch, model: Model): ModelStore => ({
  state: {
    model,
    subscribe: 0,
  },
  actions: ModelUpdates,
  computeView: (state) => {
    return {
      subscribe: state.subscribe,
      ...state.model.getters,
    };
  },
});
