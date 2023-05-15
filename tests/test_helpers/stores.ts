import { CQS, DependencyContainer, StoreConstructor } from "../../src/store/dependency_container";

export function makeStore<T extends StoreConstructor>(Store: T): CQS<InstanceType<T>> {
  const container = new DependencyContainer();
  return container.get(Store);
}

export function makeStoreContainer() {
  return new DependencyContainer();
}
