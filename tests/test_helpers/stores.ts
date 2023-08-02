import { DependencyContainer } from "../../src/store_engine/dependency_container";
import {
  ParametricStoreConstructor,
  Store,
  StoreConstructor,
  StoreParameters,
} from "../../src/store_engine/store";

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
