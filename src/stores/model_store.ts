import { Model } from "../model";
import { createAbstractStore } from "../store_engine/store";

export const ModelStore = createAbstractStore<Model>("Model");
