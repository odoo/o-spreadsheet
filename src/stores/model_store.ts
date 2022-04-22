import { Model } from "../model";

export function createModelProvider(model: Model) {
  return () => {
    return {
      state: model,
      action: class {},
      computeView: (model: Model) => model.getters,
    };
  };
}
