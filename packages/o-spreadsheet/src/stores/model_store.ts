import { Model } from "../model";
import { createAbstractStore } from "../store_engine";

export const ModelStore = createAbstractStore<Model>("Model");
