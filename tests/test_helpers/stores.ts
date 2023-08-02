import {
  DependencyContainer,
  ParametricStoreConstructor,
  Store,
  StoreConstructor,
  StoreParameters,
} from "../../src/store/dependency_container";

export function makeStore<T extends StoreConstructor>(
  Store: T,
  ...args: StoreParameters<ParametricStoreConstructor<T>>
): Store<InstanceType<T>> {
  const container = new DependencyContainer();
  return container.instantiate(Store, ...args);
}

export function makeStoreContainer() {
  return new DependencyContainer();
}
