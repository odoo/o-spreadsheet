import { Model } from "../model";
import { createValueStore } from "../store_engine/store";

export const ModelStore = createValueStore(() => new Model());
