import { Model } from "../../src";
import { DependencyContainer, StoreConstructor, StoreParams } from "../../src/store_engine";
import { ModelStore } from "../../src/stores";

export function makeStore<T extends StoreConstructor>(Store: T, ...args: StoreParams<T>) {
  const container = new DependencyContainer();
  container.inject(ModelStore, new Model());
  return {
    store: container.instantiate(Store, ...args) as InstanceType<T>,
    container,
    model: container.get(ModelStore),
  };
}
