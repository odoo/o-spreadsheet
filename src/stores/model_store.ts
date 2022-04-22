import { Model } from "../model";

export const ModelProvider = (model: Model) => ({
  state: model,
  actions: class {},
  computeView: (model: Model) => model.getters,
});
