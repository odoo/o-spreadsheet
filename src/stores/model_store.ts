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
      this.state.subscribe++;
    });
  }
}

type ModelStore = StoreConfig<State, Getters, ModelUpdates>;

export const ModelProvider = (stores: StoresWatch, model: Model): ModelStore => ({
  state: {
    model,
    subscribe: 0,
  },
  actions: ModelUpdates,
  computeView: (state) => {
    console.log("model update");
    state.subscribe; // read the reactive state
    return model.getters;
  },
});
