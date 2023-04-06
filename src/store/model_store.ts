import { Model } from "../model";
import { createValueStore } from "./dependency_container";

export const ModelStore = createValueStore(() => new Model());
