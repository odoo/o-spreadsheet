import {
  DependencyContainer,
  ModelStore,
  StoreConstructor,
  StoreParameters,
} from "../../src/store_engine";

export function makeStore<T extends StoreConstructor>(Store: T, ...args: StoreParameters<T>) {
  const container = new DependencyContainer();
  return {
    store: container.instantiate(Store, ...args) as InstanceType<T>,
    container,
    model: container.get(ModelStore),
  };
}
