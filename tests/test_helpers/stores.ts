import {
  DependencyContainer,
  Store,
  StoreConstructor,
  StoreParameters,
} from "../../src/store/dependency_container";

export function makeStore<T extends StoreConstructor>(
  Store: T,
  ...args: StoreParameters<StoreConstructor<T>>
): Store<InstanceType<T>> {
  const container = new DependencyContainer();
  return container.get(Store, ...args);
}

export function makeStoreContainer() {
  return new DependencyContainer();
}
